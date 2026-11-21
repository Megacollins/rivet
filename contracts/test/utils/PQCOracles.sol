// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Vm} from "forge-std/Vm.sol";

Vm constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

/// @dev Local stand-in for QoreChain's pqcVerify precompile (0x0a01), etched at that address in tests.
/// Foundry's EVM has no QoreChain precompiles, so this delegates to a REAL ML-DSA-87 verifier
/// (noble post-quantum, via engine/src/ffi.ts). Same ABI and the same observed semantics as the
/// live precompile: returns false (never reverts) on malformed input.
contract FfiPQCVerify {
    function pqcVerify(bytes calldata pubkey, bytes calldata signature, bytes calldata message) external returns (bool) {
        string[] memory cmd = new string[](6);
        cmd[0] = "node";
        cmd[1] = "../engine/src/ffi.ts";
        cmd[2] = "verify";
        cmd[3] = VM.toString(pubkey);
        cmd[4] = VM.toString(signature);
        cmd[5] = VM.toString(message);
        return abi.decode(VM.ffi(cmd), (bool));
    }
}

/// @dev Local stand-in for pqcKeyStatus (0x0a02): the test sets each account's x/pqc registration.
contract MockPQCKeyStatus {
    struct Status {
        bool registered;
        uint8 algorithmId;
        bytes pubkey;
        bool possessionProven;
    }

    mapping(address => Status) internal _s;

    function set(address account, bool registered, uint8 algorithmId, bytes calldata pubkey, bool possessionProven) external {
        _s[account] = Status(registered, algorithmId, pubkey, possessionProven);
    }

    function pqcKeyStatus(address account) external view returns (bool, uint8, bytes memory, bool) {
        Status storage st = _s[account];
        return (st.registered, st.algorithmId, st.pubkey, st.possessionProven);
    }
}

library MlDsa {
    function pubkey(bytes32 seed) internal returns (bytes memory) {
        string[] memory cmd = new string[](4);
        cmd[0] = "node";
        cmd[1] = "../engine/src/ffi.ts";
        cmd[2] = "pubkey";
        cmd[3] = VM.toString(abi.encodePacked(seed));
        return VM.ffi(cmd);
    }

    /// Deterministic ML-DSA-87 (pure, empty context) signature by the key derived from `seed`.
    function sign(bytes32 seed, bytes memory message) internal returns (bytes memory) {
        string[] memory cmd = new string[](5);
        cmd[0] = "node";
        cmd[1] = "../engine/src/ffi.ts";
        cmd[2] = "sign";
        cmd[3] = VM.toString(abi.encodePacked(seed));
        cmd[4] = VM.toString(message);
        return VM.ffi(cmd);
    }
}
