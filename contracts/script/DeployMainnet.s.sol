// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {DeskFactory} from "../src/DeskFactory.sol";

/// @notice GUARDED mainnet deploy. Phase 0 must NOT deploy to mainnet. This
///         script refuses to run unless `CONFIRM_MAINNET=I_UNDERSTAND` and the
///         chain id is the known mainnet id (4663). Even then, review carefully.
contract DeployMainnet is Script {
    uint256 internal constant RH_MAINNET = 4663;

    function run() external {
        string memory confirm = vm.envOr("CONFIRM_MAINNET", string(""));
        require(
            keccak256(bytes(confirm)) == keccak256(bytes("I_UNDERSTAND")),
            "refusing mainnet deploy: set CONFIRM_MAINNET=I_UNDERSTAND"
        );
        require(block.chainid == RH_MAINNET, "not Robinhood mainnet");

        address owner = vm.envAddress("OWNER");
        address usdg = vm.envAddress("USDG_ADDRESS");

        vm.startBroadcast();

        RiskModule risk = new RiskModule(owner);
        SwapAdapter swap = new SwapAdapter(owner);
        FeeModule fee = new FeeModule(
            owner,
            FeeModule.FeeParams({performanceFeeBps: 1_000, aumFeeBpsPerYear: 200, protocolShareBps: 2_000})
        );
        DeskFactory factory = new DeskFactory(owner, usdg, risk, swap);

        vm.stopBroadcast();

        console2.log("RiskModule", address(risk));
        console2.log("SwapAdapter", address(swap));
        console2.log("FeeModule", address(fee));
        console2.log("DeskFactory", address(factory));
    }
}
