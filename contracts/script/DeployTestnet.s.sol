// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ChainlinkOracle} from "../src/ChainlinkOracle.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {DeskFactory} from "../src/DeskFactory.sol";
import {DeskVault} from "../src/DeskVault.sol";

/// @notice Deploys Phase 1 live-copy wiring to Robinhood testnet.
///         Never deploys SeatToken. setRouter only if SWAP_ROUTER_ADDRESS is
///         set (none is cited for 46630 — leave unset).
contract DeployTestnet is Script {
    function run() external {
        address owner = vm.envOr("OWNER", msg.sender);
        address usdg = vm.envAddress("USDG_ADDRESS");
        address leader = vm.envOr("LEADER_ADDRESS", address(0));
        address keeper = vm.envOr("KEEPER_ADDRESS", address(0));
        uint256 maxFillUsdg = vm.envOr("MAX_FILL_USDG", uint256(0));
        address swapRouter = vm.envOr("SWAP_ROUTER_ADDRESS", address(0));
        address protocol = vm.envOr("PROTOCOL_FEE_RECIPIENT", owner);

        vm.startBroadcast();

        RiskModule risk = new RiskModule(owner);
        SwapAdapter swap = new SwapAdapter(owner);
        if (swapRouter != address(0)) {
            swap.setRouter(swapRouter);
        }
        FeeModule fee = new FeeModule(
            owner,
            FeeModule.FeeParams({
                performanceFeeBps: 1_000,
                aumFeeBpsPerYear: 200,
                protocolShareBps: 2_000,
                stakerShareBps: 0
            })
        );
        ChainlinkOracle oracle = new ChainlinkOracle(owner);
        DeskFactory factory = new DeskFactory(owner, usdg, risk, swap);

        address vault;
        if (leader != address(0)) {
            if (owner != msg.sender) {
                console2.log("skip createDesk: OWNER != broadcaster; call createDesk separately");
            } else {
                vault = factory.createDesk(leader);
                DeskVault desk = DeskVault(vault);
                desk.setOracle(oracle);
                desk.setFeeModule(fee);
                desk.setFeeRecipients(protocol, leader, address(0));
                if (keeper != address(0)) {
                    desk.setKeeper(keeper);
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
        console2.log("ChainlinkOracle", address(oracle));
        console2.log("DeskFactory", address(factory));
        if (vault != address(0)) {
            console2.log("DeskVault", vault);
            console2.log("Leader", leader);
            if (keeper != address(0)) console2.log("Keeper", keeper);
        }
        if (swapRouter == address(0)) {
            console2.log("SwapAdapter.router left 0 (no cited 46630 router)");
        }
    }
}
