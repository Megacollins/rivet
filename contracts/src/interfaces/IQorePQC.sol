// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice QoreChain PQC precompiles (docs.qorechain.io/developer-guide/evm-precompiles).
/// Active on the Diana testnet (chain id 9800) only. An inactive precompile address
/// returns empty data instead of reverting, so callers MUST check the return length.

/// @dev 0x0000000000000000000000000000000000000A01
/// Verified live 2026-11-21: pure ML-DSA-87, empty FIPS 204 context, raw message,
/// returns false (does not revert) for wrong-length or invalid input.
interface IQorePQC {
    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message)
        external
        view
        returns (bool valid);
}

/// @dev 0x0000000000000000000000000000000000000A02 (four return values since chain v3.2.4)
interface IQorePQCKeyStatus {
    function pqcKeyStatus(address account)
        external
        view
        returns (bool registered, uint8 algorithmId, bytes memory pubkey, bool possessionProven);
}
