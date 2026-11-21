// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IQorePQC, IQorePQCKeyStatus} from "./interfaces/IQorePQC.sol";

/// @title RivetRegistry
/// @notice On-chain registry of ML-DSA-87-attested cryptographic compatibility reports.
///
/// Security model
/// - Every sensitive action (publish, revoke, deactivate) is authorised by an ML-DSA-87
///   signature checked with QoreChain's `pqcVerify` precompile. The EVM sender (classical
///   ECDSA) is irrelevant to authorisation: anyone may relay a signed request.
/// - An attester's ML-DSA key is its QoreChain account key, read from the `pqcKeyStatus`
///   precompile. Registration requires the key to be ML-DSA-87 with proof of possession.
/// - Replay protection: per-attester strictly sequential nonce, deadline, and a signed
///   message bound to chain id, this contract's address, the attester and the action.
/// - Domain separation: signed messages start with the ASCII tag `RIVET/ATTEST/v1`. Read as
///   QoreChain's v1 hybrid sign-bytes frame, its first four bytes declare a length of
///   0x52495645 (~1.38 GB), which can never match; it also differs from the
///   `qorechain-pqc-hybrid-v2` and `qorechain-pqc-pop-v1` prefixes the chain signs.
contract RivetRegistry {
    // ---------------------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------------------

    address public constant PQC_VERIFY = 0x0000000000000000000000000000000000000a01;
    address public constant PQC_KEY_STATUS = 0x0000000000000000000000000000000000000a02;

    uint8 public constant ALGORITHM_ML_DSA_87 = 1;
    uint256 public constant ML_DSA_87_PUBKEY_LEN = 2592;
    uint256 public constant ML_DSA_87_SIG_LEN = 4627;

    bytes public constant DOMAIN_TAG = "RIVET/ATTEST/v1";

    uint8 public constant ACTION_PUBLISH = 1;
    uint8 public constant ACTION_REVOKE = 2;
    uint8 public constant ACTION_DEACTIVATE = 3;

    // ---------------------------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------------------------

    struct Summary {
        uint32 passed;
        uint32 failed;
        uint32 skipped;
        uint32 unsupported;
    }

    struct Attester {
        bytes32 keyHash; // keccak256 of the 2592-byte ML-DSA-87 public key
        uint64 nonce; // next expected nonce
        uint64 registeredAt;
        bool active;
    }

    struct Report {
        address attester;
        bytes32 reportHash; // keccak256 of the RFC 8785 canonical report JSON
        bytes32 uriHash;
        bytes32 keyHash; // key that signed it (survives later key rotation)
        Summary summary;
        uint64 nonce;
        uint64 deadline;
        uint64 publishedAt;
        bool revoked;
    }

    struct PublishRequest {
        address attester;
        bytes32 reportHash;
        Summary summary;
        string uri;
        uint64 nonce;
        uint64 deadline;
    }

    // ---------------------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------------------

    mapping(address => Attester) public attesters;
    mapping(uint256 => Report) internal _reports;
    mapping(bytes32 => uint256) public reportIdByHash;
    uint256 public reportCount;

    // ---------------------------------------------------------------------------------
    // Events & errors
    // ---------------------------------------------------------------------------------

    event AttesterRegistered(address indexed attester, bytes32 indexed keyHash);
    event AttesterDeactivated(address indexed attester, uint64 nonce);
    /// @dev `pubkey` and `signature` are emitted so anyone can re-verify the attestation
    /// off-chain with any ML-DSA-87 implementation, without trusting this contract.
    event ReportPublished(
        uint256 indexed reportId,
        address indexed attester,
        bytes32 indexed reportHash,
        Summary summary,
        string uri,
        uint64 nonce,
        uint64 deadline,
        bytes pubkey,
        bytes signature
    );
    event ReportRevoked(uint256 indexed reportId, address indexed attester, uint64 nonce);

    error PrecompileUnavailable(address precompile);
    error KeyNotRegistered();
    error WrongAlgorithm(uint8 algorithmId);
    error PossessionNotProven();
    error PubkeyMismatch();
    error BadPubkeyLength(uint256 length);
    error BadSignatureLength(uint256 length);
    error UnknownAttester();
    error AttesterInactive();
    error BadNonce(uint64 expected, uint64 got);
    error Expired(uint64 deadline, uint256 nowTs);
    error InvalidSignature();
    error DuplicateReport(uint256 existingId);
    error EmptyReportHash();
    error UnknownReport();
    error AlreadyRevoked();
    error KeyRevoked();

    // ---------------------------------------------------------------------------------
    // Attester lifecycle
    // ---------------------------------------------------------------------------------

    /// @notice Register (or re-register after a chain-level key rotation) the caller as an
    /// attester. The caller's ML-DSA-87 key must already be registered with QoreChain's
    /// x/pqc module with proof of possession. The nonce is never reset.
    function registerAttester(bytes calldata pubkey) external {
        if (pubkey.length != ML_DSA_87_PUBKEY_LEN) revert BadPubkeyLength(pubkey.length);
        (bool registered, uint8 algorithmId, bytes memory chainKey, bool possessionProven) = _keyStatus(msg.sender);
        if (!registered) revert KeyNotRegistered();
        if (algorithmId != ALGORITHM_ML_DSA_87) revert WrongAlgorithm(algorithmId);
        if (!possessionProven) revert PossessionNotProven();
        bytes32 keyHash = keccak256(pubkey);
        if (keccak256(chainKey) != keyHash) revert PubkeyMismatch();

        Attester storage a = attesters[msg.sender];
        // A deactivated (possibly compromised) key cannot be revived; rotate the chain key first.
        if (!a.active && a.keyHash == keyHash) revert KeyRevoked();
        a.keyHash = keyHash;
        a.active = true;
        a.registeredAt = uint64(block.timestamp);
        emit AttesterRegistered(msg.sender, keyHash);
    }

    /// @notice PQ-authorised deactivation (e.g. suspected key compromise). Relayable.
    function deactivateAttester(address attester, uint64 nonce, uint64 deadline, bytes calldata pubkey, bytes calldata signature)
        external
    {
        _authorise(attester, ACTION_DEACTIVATE, nonce, deadline, bytes32(0), pubkey, signature);
        attesters[attester].active = false;
        emit AttesterDeactivated(attester, nonce);
    }

    // ---------------------------------------------------------------------------------
    // Reports
    // ---------------------------------------------------------------------------------

    /// @notice Publish a report attestation. Relayable: authorisation is the ML-DSA signature.
    function publishReport(PublishRequest calldata req, bytes calldata pubkey, bytes calldata signature)
        external
        returns (uint256 reportId)
    {
        if (req.reportHash == bytes32(0)) revert EmptyReportHash();
        uint256 existing = reportIdByHash[req.reportHash];
        if (existing != 0) revert DuplicateReport(existing);

        bytes32 uriHash = keccak256(bytes(req.uri));
        bytes32 payload = publishPayload(req.reportHash, req.summary, uriHash);
        bytes32 keyHash = _authorise(req.attester, ACTION_PUBLISH, req.nonce, req.deadline, payload, pubkey, signature);

        reportId = ++reportCount;
        _reports[reportId] = Report({
            attester: req.attester,
            reportHash: req.reportHash,
            uriHash: uriHash,
            keyHash: keyHash,
            summary: req.summary,
            nonce: req.nonce,
            deadline: req.deadline,
            publishedAt: uint64(block.timestamp),
            revoked: false
        });
        reportIdByHash[req.reportHash] = reportId;

        emit ReportPublished(
            reportId, req.attester, req.reportHash, req.summary, req.uri, req.nonce, req.deadline, pubkey, signature
        );
    }

    /// @notice PQ-authorised revocation by the report's attester. Relayable.
    function revokeReport(uint256 reportId, uint64 nonce, uint64 deadline, bytes calldata pubkey, bytes calldata signature)
        external
    {
        Report storage r = _reports[reportId];
        if (r.attester == address(0)) revert UnknownReport();
        if (r.revoked) revert AlreadyRevoked();
        _authorise(r.attester, ACTION_REVOKE, nonce, deadline, revokePayload(reportId), pubkey, signature);
        r.revoked = true;
        emit ReportRevoked(reportId, r.attester, nonce);
    }

    // ---------------------------------------------------------------------------------
    // Independent verification (view)
    // ---------------------------------------------------------------------------------

    function getReport(uint256 reportId) external view returns (Report memory) {
        return _reports[reportId];
    }

    /// @notice Re-run pqcVerify over a stored report's original signed message.
    /// `pubkey` and `signature` come from the ReportPublished event.
    /// @return valid true iff the key matches the one that signed and the signature verifies.
    function verifyAttestation(uint256 reportId, bytes calldata pubkey, bytes calldata signature)
        external
        view
        returns (bool valid)
    {
        Report storage r = _reports[reportId];
        if (r.attester == address(0)) revert UnknownReport();
        if (keccak256(pubkey) != r.keyHash) return false;
        bytes memory message = signingMessage(
            ACTION_PUBLISH, r.attester, r.nonce, r.deadline, publishPayload(r.reportHash, r.summary, r.uriHash)
        );
        return _pqcVerify(pubkey, signature, message);
    }

    // ---------------------------------------------------------------------------------
    // Message construction (public so off-chain tools can cross-check their encoding)
    // ---------------------------------------------------------------------------------

    function publishPayload(bytes32 reportHash, Summary memory summary, bytes32 uriHash) public pure returns (bytes32) {
        return keccak256(abi.encode(reportHash, summary, uriHash));
    }

    function revokePayload(uint256 reportId) public pure returns (bytes32) {
        return keccak256(abi.encode(reportId));
    }

    /// @notice Exact bytes the attester signs with ML-DSA-87 (pure, empty context).
    function signingMessage(uint8 action, address attester, uint64 nonce, uint64 deadline, bytes32 payload)
        public
        view
        returns (bytes memory)
    {
        return bytes.concat(DOMAIN_TAG, abi.encode(action, block.chainid, address(this), attester, nonce, deadline, payload));
    }

    // ---------------------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------------------

    /// @dev Checks-effects: validates and consumes the nonce before returning. The only
    /// external calls are staticcalls to precompiles, so there is no reentrancy surface.
    function _authorise(
        address attester,
        uint8 action,
        uint64 nonce,
        uint64 deadline,
        bytes32 payload,
        bytes calldata pubkey,
        bytes calldata signature
    ) internal returns (bytes32 keyHash) {
        Attester storage a = attesters[attester];
        if (a.keyHash == bytes32(0)) revert UnknownAttester();
        if (!a.active) revert AttesterInactive();
        if (nonce != a.nonce) revert BadNonce(a.nonce, nonce);
        if (block.timestamp > deadline) revert Expired(deadline, block.timestamp);
        if (pubkey.length != ML_DSA_87_PUBKEY_LEN) revert BadPubkeyLength(pubkey.length);
        if (signature.length != ML_DSA_87_SIG_LEN) revert BadSignatureLength(signature.length);
        keyHash = keccak256(pubkey);
        if (keyHash != a.keyHash) revert PubkeyMismatch();

        bytes memory message = signingMessage(action, attester, nonce, deadline, payload);
        if (!_pqcVerify(pubkey, signature, message)) revert InvalidSignature();

        a.nonce = nonce + 1;
    }

    function _pqcVerify(bytes memory pubkey, bytes memory signature, bytes memory message) internal view returns (bool) {
        (bool ok, bytes memory ret) =
            PQC_VERIFY.staticcall(abi.encodeCall(IQorePQC.pqcVerify, (pubkey, signature, message)));
        if (!ok || ret.length != 32) revert PrecompileUnavailable(PQC_VERIFY);
        return abi.decode(ret, (bool));
    }

    function _keyStatus(address account)
        internal
        view
        returns (bool registered, uint8 algorithmId, bytes memory pubkey, bool possessionProven)
    {
        (bool ok, bytes memory ret) =
            PQC_KEY_STATUS.staticcall(abi.encodeCall(IQorePQCKeyStatus.pqcKeyStatus, (account)));
        if (!ok || ret.length < 160) revert PrecompileUnavailable(PQC_KEY_STATUS);
        return abi.decode(ret, (bool, uint8, bytes, bool));
    }
}
