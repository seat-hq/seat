// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {DeskFactory} from "../src/DeskFactory.sol";
import {DeskVault} from "../src/DeskVault.sol";

/// @notice Deploys the Phase 1 core to Robinhood testnet. No SeatToken (stub),
///         and SwapAdapter is left without a router (fail-closed).
///         If LEADER_ADDRESS is set and the broadcaster is OWNER, createDesk
///         is called and the vault is logged. Optional KEEPER_ADDRESS /
///         MAX_FILL_USDG configure the vault and risk module.
contract DeployTestnet is Script {
    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);
        address usdg = vm.envAddress("USDG_ADDRESS");
        address leader = vm.envOr("LEADER_ADDRESS", address(0));
        address keeper = vm.envOr("KEEPER_ADDRESS", address(0));
        uint256 maxFillUsdg = vm.envOr("MAX_FILL_USDG", uint256(0));

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

        address vault;
        if (leader != address(0)) {
            if (owner != msg.sender) {
                console2.log("skip createDesk: OWNER != broadcaster; call createDesk separately");
            } else {
                vault = factory.createDesk(leader);
                if (keeper != address(0)) {
                    DeskVault(vault).setKeeper(keeper);
                }
                if (maxFillUsdg > 0) {
                    uint256 maxPositionUsdg = vm.envOr("MAX_POSITION_USDG", uint256(5_000e6));
                    uint256 maxGrossUsdg = vm.envOr("MAX_GROSS_USDG", uint256(10_000e6));
                    uint256 maxDrawdownBps = vm.envOr("MAX_DRAWDOWN_BPS", uint256(2_000));
                    uint256 maxStalenessSec = vm.envOr("MAX_STALENESS_SEC", uint256(120));
                    risk.configureDesk(
                        vault,
                        maxFillUsdg,
                        maxPositionUsdg,
                        maxGrossUsdg,
                        uint16(maxDrawdownBps),
                        uint32(maxStalenessSec)
                    );
                }
            }
        }

        vm.stopBroadcast();

        console2.log("RiskModule", address(risk));
        console2.log("SwapAdapter", address(swap));
        console2.log("FeeModule", address(fee));
        console2.log("DeskFactory", address(factory));
        if (vault != address(0)) {
            console2.log("DeskVault", vault);
            console2.log("Leader", leader);
            if (keeper != address(0)) console2.log("Keeper", keeper);
        }
    }
}
