// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {DeskFactory} from "../src/DeskFactory.sol";

/// @notice Deploys the Phase 0 core to Robinhood testnet. No SeatToken (stub),
///         and SwapAdapter is left without a router (fail-closed).
contract DeployTestnet is Script {
    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);
        address usdg = vm.envAddress("USDG_ADDRESS");

        vm.startBroadcast();

        RiskModule risk = new RiskModule(owner);
        SwapAdapter swap = new SwapAdapter(owner);
        FeeModule fee = new FeeModule(
            owner,
            FeeModule.FeeParams({
                performanceFeeBps: 1_000, // 10%
                aumFeeBpsPerYear: 200, // 2%/yr
                protocolShareBps: 2_000 // 20% of fees to protocol
            })
        );
        DeskFactory factory = new DeskFactory(owner, usdg, risk, swap);

        vm.stopBroadcast();

        console2.log("RiskModule", address(risk));
        console2.log("SwapAdapter", address(swap));
        console2.log("FeeModule", address(fee));
        console2.log("DeskFactory", address(factory));
    }
}
