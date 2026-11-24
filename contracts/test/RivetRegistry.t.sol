// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {RivetRegistry} from "../src/RivetRegistry.sol";
import {FfiPQCVerify, MockPQCKeyStatus, MlDsa} from "./utils/PQCOracles.sol";

contract RivetRegistryTest is Test {
    address constant PQC_VERIFY = 0x0000000000000000000000000000000000000a01;
    address constant PQC_KEY_STATUS = 0x0000000000000000000000000000000000000a02;

    RivetRegistry reg;
    MockPQCKeyStatus keyStatus;

    bytes32 constant SEED_A = keccak256("rivet-test-attester-a");
    bytes32 constant SEED_B = keccak256("rivet-test-attester-b");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address relayer = makeAddr("relayer");
    bytes pkA;
    bytes pkB;

    function setUp() public {
        vm.chainId(9800);
        vm.warp(1_790_000_000);
        vm.etch(PQC_VERIFY, address(new FfiPQCVerify()).code);
        vm.etch(PQC_KEY_STATUS, address(new MockPQCKeyStatus()).code);
        keyStatus = MockPQCKeyStatus(PQC_KEY_STATUS);

        pkA = MlDsa.pubkey(SEED_A);
        pkB = MlDsa.pubkey(SEED_B);
        assertEq(pkA.length, 2592, "real ML-DSA-87 pubkey");

        reg = new RivetRegistry();
        _register(reg, alice, pkA);
    }

    // ----------------------------------------------------------------- helpers

    function _register(RivetRegistry r, address who, bytes memory pk) internal {
        keyStatus.set(who, true, 1, pk, true);
        vm.prank(who);
        r.registerAttester(pk);
    }

    function _summary() internal pure returns (RivetRegistry.Summary memory) {
        return RivetRegistry.Summary({passed: 41, failed: 0, skipped: 2, unsupported: 3});
    }

    function _req(address attester, bytes32 reportHash, uint64 nonce) internal view returns (RivetRegistry.PublishRequest memory) {
        return RivetRegistry.PublishRequest({
            attester: attester,
            reportHash: reportHash,
            summary: _summary(),
            uri: "ipfs://rivet-report",
            nonce: nonce,
            deadline: uint64(block.timestamp + 1 hours)
        });
    }

    function _publishMsg(RivetRegistry r, RivetRegistry.PublishRequest memory q) internal view returns (bytes memory) {
        bytes32 payload = r.publishPayload(q.reportHash, q.summary, keccak256(bytes(q.uri)));
        return r.signingMessage(r.ACTION_PUBLISH(), q.attester, q.nonce, q.deadline, payload);
    }

    function _signPublish(bytes32 seed, RivetRegistry r, RivetRegistry.PublishRequest memory q) internal returns (bytes memory) {
        return MlDsa.sign(seed, _publishMsg(r, q));
    }

    // ----------------------------------------------------------------- happy path

    function test_publish_validSignature_byRelayer() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("report-1"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        assertEq(sig.length, 4627);

        vm.prank(relayer); // EVM sender is irrelevant: the ML-DSA signature authorises
        uint256 id = reg.publishReport(q, pkA, sig);

        assertEq(id, 1);
        RivetRegistry.Report memory r = reg.getReport(id);
        assertEq(r.attester, alice);
        assertEq(r.reportHash, q.reportHash);
        assertEq(r.keyHash, keccak256(pkA));
        assertEq(r.summary.passed, 41);
        (, uint64 nonce,,) = reg.attesters(alice);
        assertEq(nonce, 1);
        assertEq(reg.reportIdByHash(q.reportHash), 1);
    }

    function test_signingMessage_layout() public view {
        bytes memory m = reg.signingMessage(1, alice, 7, 9, bytes32(uint256(0xabc)));
        assertEq(m.length, 15 + 7 * 32, "tag + 7 words");
        assertEq(bytes15(bytes(m)), bytes15("RIVET/ATTEST/v1"));
    }

    /// The TypeScript engine encodes the signed message independently; it must match the contract byte-for-byte.
    function test_engineEncoding_matchesContract() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("report-x"), 3);
        string[] memory cmd = new string[](12);
        cmd[0] = "node";
        cmd[1] = "../engine/src/ffi.ts";
        cmd[2] = "message";
        cmd[3] = vm.toString(block.chainid);
        cmd[4] = vm.toString(address(reg));
        cmd[5] = "1";
        cmd[6] = vm.toString(alice);
        cmd[7] = vm.toString(uint256(q.nonce));
        cmd[8] = vm.toString(uint256(q.deadline));
        cmd[9] = vm.toString(q.reportHash);
        cmd[10] = "41,0,2,3";
        cmd[11] = q.uri;
        assertEq(vm.ffi(cmd), _publishMsg(reg, q));
    }

    function test_verifyAttestation_independent() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("report-1"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        uint256 id = reg.publishReport(q, pkA, sig);

        assertTrue(reg.verifyAttestation(id, pkA, sig));
        bytes memory bad = sig;
        bad[100] ^= 0x01;
        assertFalse(reg.verifyAttestation(id, pkA, bad), "tampered sig");
        assertFalse(reg.verifyAttestation(id, pkB, sig), "other key");
    }

    // ----------------------------------------------------------------- signature attacks

    function test_reject_tamperedSignature() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        sig[2000] ^= 0x80;
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_reject_modifiedSummaryAfterSigning() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        q.summary.failed = 0;
        q.summary.passed = 46; // claim a better result than was signed
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_reject_modifiedUriAfterSigning() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        q.uri = "ipfs://attacker";
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_reject_wrongPublicKey() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(RivetRegistry.PubkeyMismatch.selector);
        reg.publishReport(q, pkB, sig);
    }

    function test_reject_signedByOtherKey() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_B, reg, q); // bob's key, alice's request
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_reject_malformedLengths() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.BadSignatureLength.selector, 4626));
        reg.publishReport(q, pkA, _slice(sig, 4626));
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.BadPubkeyLength.selector, 2591));
        reg.publishReport(q, _slice(pkA, 2591), sig);
    }

    // ----------------------------------------------------------------- replay protection

    function test_replay_sameSignatureTwice() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        reg.publishReport(q, pkA, sig);
        q.reportHash = keccak256("r2"); // even with a fresh report hash, nonce 0 is spent
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.BadNonce.selector, 1, 0));
        reg.publishReport(q, pkA, sig);
    }

    function test_replay_wrongChainId() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        vm.chainId(9801); // signed for QoreChain mainnet's EVM id
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.chainId(9800);
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_replay_wrongContract() public {
        RivetRegistry other = new RivetRegistry();
        _register(other, alice, pkA);
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, other, q); // valid for `other`
        other.publishReport(q, pkA, sig);
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_replay_wrongActionContext() public {
        // A REVOKE authorisation must not be usable as a PUBLISH authorisation.
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes32 payload = reg.publishPayload(q.reportHash, q.summary, keccak256(bytes(q.uri)));
        bytes memory revokeMsg = reg.signingMessage(reg.ACTION_REVOKE(), alice, 0, q.deadline, payload);
        bytes memory sig = MlDsa.sign(SEED_A, revokeMsg);
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkA, sig);
    }

    function test_replay_otherAttestersRequest() public {
        _register(reg, bob, pkB);
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        q.attester = bob; // try to attribute alice's signed report to bob
        vm.expectRevert(RivetRegistry.PubkeyMismatch.selector);
        reg.publishReport(q, pkA, sig);
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q, pkB, sig);
    }

    function test_replay_futureNonce() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 5);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.BadNonce.selector, 0, 5));
        reg.publishReport(q, pkA, sig);
    }

    function test_replay_expiredDeadline() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.warp(q.deadline + 1);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.Expired.selector, q.deadline, q.deadline + 1));
        reg.publishReport(q, pkA, sig);
    }

    function testFuzz_badNonceRejectedBeforeVerify(uint64 nonce) public {
        vm.assume(nonce != 0);
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), nonce);
        bytes memory junk = new bytes(4627);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.BadNonce.selector, 0, nonce));
        reg.publishReport(q, pkA, junk);
    }

    // ----------------------------------------------------------------- report lifecycle

    function test_duplicateReportHash() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        reg.publishReport(q, pkA, _signPublish(SEED_A, reg, q));
        RivetRegistry.PublishRequest memory q2 = _req(alice, keccak256("r"), 1);
        bytes memory sig2 = _signPublish(SEED_A, reg, q2);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.DuplicateReport.selector, 1));
        reg.publishReport(q2, pkA, sig2);
    }

    function test_emptyReportHash() public {
        RivetRegistry.PublishRequest memory q = _req(alice, bytes32(0), 0);
        vm.expectRevert(RivetRegistry.EmptyReportHash.selector);
        reg.publishReport(q, pkA, new bytes(4627));
    }

    function test_revoke_flow() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        uint256 id = reg.publishReport(q, pkA, _signPublish(SEED_A, reg, q));

        uint64 deadline = uint64(block.timestamp + 600);
        bytes memory m = reg.signingMessage(reg.ACTION_REVOKE(), alice, 1, deadline, reg.revokePayload(id));
        bytes memory sig = MlDsa.sign(SEED_A, m);
        vm.prank(relayer);
        reg.revokeReport(id, 1, deadline, pkA, sig);
        assertTrue(reg.getReport(id).revoked);

        vm.expectRevert(RivetRegistry.AlreadyRevoked.selector);
        reg.revokeReport(id, 2, deadline, pkA, sig);
    }

    function test_revoke_wrongReportIdInPayload() public {
        RivetRegistry.PublishRequest memory q1 = _req(alice, keccak256("r1"), 0);
        reg.publishReport(q1, pkA, _signPublish(SEED_A, reg, q1));
        RivetRegistry.PublishRequest memory q2 = _req(alice, keccak256("r2"), 1);
        reg.publishReport(q2, pkA, _signPublish(SEED_A, reg, q2));

        uint64 deadline = uint64(block.timestamp + 600);
        bytes memory m = reg.signingMessage(reg.ACTION_REVOKE(), alice, 2, deadline, reg.revokePayload(1));
        bytes memory sig = MlDsa.sign(SEED_A, m);
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.revokeReport(2, 2, deadline, pkA, sig); // signature authorises revoking #1, not #2
    }

    function test_deactivate_blocksPublish_andKeyCannotBeRevived() public {
        uint64 deadline = uint64(block.timestamp + 600);
        bytes memory m = reg.signingMessage(reg.ACTION_DEACTIVATE(), alice, 0, deadline, bytes32(0));
        reg.deactivateAttester(alice, 0, deadline, pkA, MlDsa.sign(SEED_A, m));

        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 1);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(RivetRegistry.AttesterInactive.selector);
        reg.publishReport(q, pkA, sig);

        vm.prank(alice);
        vm.expectRevert(RivetRegistry.KeyRevoked.selector);
        reg.registerAttester(pkA);

        // After rotating the chain key, alice can come back; the nonce keeps counting.
        _register(reg, alice, pkB);
        (, uint64 nonce,, bool active) = reg.attesters(alice);
        assertTrue(active);
        assertEq(nonce, 1);
    }

    // ----------------------------------------------------------------- registration

    function test_register_requiresChainKey() public {
        vm.prank(bob);
        vm.expectRevert(RivetRegistry.KeyNotRegistered.selector);
        reg.registerAttester(pkB);
    }

    function test_register_requiresMlDsa87() public {
        keyStatus.set(bob, true, 2, pkB, true);
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.WrongAlgorithm.selector, 2));
        reg.registerAttester(pkB);
    }

    function test_register_requiresPossessionProof() public {
        keyStatus.set(bob, true, 1, pkB, false);
        vm.prank(bob);
        vm.expectRevert(RivetRegistry.PossessionNotProven.selector);
        reg.registerAttester(pkB);
    }

    function test_register_pubkeyMustMatchChainKey() public {
        keyStatus.set(bob, true, 1, pkB, true);
        vm.prank(bob);
        vm.expectRevert(RivetRegistry.PubkeyMismatch.selector);
        reg.registerAttester(pkA); // bob claims alice's key
    }

    function test_precompileUnavailable_reverts() public {
        vm.etch(PQC_KEY_STATUS, ""); // e.g. mainnet today: inactive address returns empty data
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.PrecompileUnavailable.selector, PQC_KEY_STATUS));
        reg.registerAttester(pkB);

        vm.etch(PQC_VERIFY, "");
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.PrecompileUnavailable.selector, PQC_VERIFY));
        reg.publishReport(q, pkA, new bytes(4627));
    }

    // ----------------------------------------------------------------- QCAI stage 1 regression tests (docs/AUDIT.md)

    /// QCAI-1: registration is open by design, but only for the caller's own chain key,
    /// and a newcomer can neither change an existing attester's record nor sign as them.
    function test_qcai1_openRegistration_cannotTouchOtherAttesters() public {
        (bytes32 keyBefore, uint64 nonceBefore,, bool activeBefore) = reg.attesters(alice);

        address mallory = makeAddr("mallory");
        keyStatus.set(mallory, true, 1, pkB, true);
        vm.prank(mallory);
        reg.registerAttester(pkB); // succeeds: mallory registers her own key

        (bytes32 keyAfter, uint64 nonceAfter,, bool activeAfter) = reg.attesters(alice);
        assertEq(keyAfter, keyBefore);
        assertEq(nonceAfter, nonceBefore);
        assertEq(activeAfter, activeBefore);

        // mallory cannot publish as alice with her own key, signed or not
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_B, reg, q);
        vm.expectRevert(RivetRegistry.PubkeyMismatch.selector);
        reg.publishReport(q, pkB, sig);
    }

    /// QCAI-2: the uint64 nonce uses checked arithmetic; at the maximum it reverts, never wraps to 0.
    function test_qcai2_nonceAtMaxReverts_neverWraps() public {
        bytes32 slot = bytes32(uint256(keccak256(abi.encode(alice, uint256(0)))) + 1); // attesters[alice].{nonce,registeredAt,active}
        bytes32 packed = vm.load(address(reg), slot);
        packed = (packed & ~bytes32(uint256(type(uint64).max))) | bytes32(uint256(type(uint64).max));
        vm.store(address(reg), slot, packed);
        (, uint64 nonce,,) = reg.attesters(alice);
        assertEq(nonce, type(uint64).max);

        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), type(uint64).max);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(abi.encodeWithSignature("Panic(uint256)", 0x11)); // arithmetic overflow
        reg.publishReport(q, pkA, sig);
    }

    /// QCAI-3: a precompile that reverts (not just an empty address) also fails closed.
    function test_qcai3_revertingPrecompile_failsClosed() public {
        vm.etch(PQC_VERIFY, hex"60006000fd"); // PUSH1 0 PUSH1 0 REVERT
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.PrecompileUnavailable.selector, PQC_VERIFY));
        reg.publishReport(q, pkA, sig);
        assertEq(reg.reportCount(), 0);
    }

    /// QCAI-4: a signed PUBLISH cannot be replayed as DEACTIVATE (the action is inside the signed message).
    function test_qcai4_publishSignatureCannotDeactivate() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.deactivateAttester(alice, 0, q.deadline, pkA, sig);
        (,,, bool active) = reg.attesters(alice);
        assertTrue(active);
    }

    /// QCAI-4: one nonce sequence covers every action, so a nonce spent by PUBLISH is spent for REVOKE too.
    function test_qcai4_nonceSharedAcrossActions() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        reg.publishReport(q, pkA, _signPublish(SEED_A, reg, q));
        bytes memory revokeMsg = reg.signingMessage(reg.ACTION_REVOKE(), alice, 0, q.deadline, reg.revokePayload(1));
        bytes memory sig = MlDsa.sign(SEED_A, revokeMsg);
        vm.expectRevert(abi.encodeWithSelector(RivetRegistry.BadNonce.selector, 1, 0));
        reg.revokeReport(1, 0, q.deadline, pkA, sig);
    }

    // ----------------------------------------------------------------- QCAI stage 2 regression tests (docs/AUDIT.md)

    /// QCAI-S2-1: a deactivated key stays revoked even after rotating to another key and back (A → B → A).
    function test_qcaiS2_revokedKeyCannotReturnAfterRotation() public {
        uint64 deadline = uint64(block.timestamp + 600);
        bytes memory m = reg.signingMessage(reg.ACTION_DEACTIVATE(), alice, 0, deadline, bytes32(0));
        reg.deactivateAttester(alice, 0, deadline, pkA, MlDsa.sign(SEED_A, m));
        assertTrue(reg.revokedKeys(alice, keccak256(pkA)));

        _register(reg, alice, pkB); // rotate to B: allowed

        keyStatus.set(alice, true, 1, pkA, true); // chain key switched back to A
        vm.prank(alice);
        vm.expectRevert(RivetRegistry.KeyRevoked.selector);
        reg.registerAttester(pkA);

        // B is still the active key, and A still cannot sign
        (bytes32 kh,,, bool active) = reg.attesters(alice);
        assertEq(kh, keccak256(pkB));
        assertTrue(active);
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 1);
        bytes memory sig = _signPublish(SEED_A, reg, q);
        vm.expectRevert(RivetRegistry.PubkeyMismatch.selector);
        reg.publishReport(q, pkA, sig);
    }

    /// QCAI-S2-2: a long URI cannot bloat storage. Only its 32-byte hash is stored, the URI is
    /// covered by the attester's signature, and the relayer pays for its own calldata.
    function test_qcaiS2_longUri_storesOnlyHash() public {
        RivetRegistry.PublishRequest memory q = _req(alice, keccak256("r"), 0);
        q.uri = string(new bytes(8192));
        uint256 id = reg.publishReport(q, pkA, _signPublish(SEED_A, reg, q));
        assertEq(reg.getReport(id).uriHash, keccak256(bytes(q.uri)));

        // and a URI swapped after signing is rejected, whatever its length
        RivetRegistry.PublishRequest memory q2 = _req(alice, keccak256("r2"), 1);
        bytes memory sig = _signPublish(SEED_A, reg, q2);
        q2.uri = string(new bytes(8193));
        vm.expectRevert(RivetRegistry.InvalidSignature.selector);
        reg.publishReport(q2, pkA, sig);
    }

    // -----------------------------------------------------------------

    function _slice(bytes memory b, uint256 n) internal pure returns (bytes memory out) {
        out = new bytes(n);
        for (uint256 i; i < n; ++i) out[i] = b[i];
    }
}
