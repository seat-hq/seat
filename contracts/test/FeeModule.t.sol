// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {FeeModule} from "../src/FeeModule.sol";

contract FeeModuleTest is Test {
    FeeModule internal fee;

    function setUp() public {
        fee = new FeeModule(
            address(this),
            FeeModule.FeeParams({
                performanceFeeBps: 1_000,
                aumFeeBpsPerYear: 200,
                protocolShareBps: 2_000,
                stakerShareBps: 1_000
            })
        );
    }

    function test_PerformanceFee() public view {
        assertEq(fee.performanceFee(1_000e6), 100e6); // 10%
    }

    function test_PerformanceFee_ZeroProfit() public view {
        assertEq(fee.performanceFee(0), 0);
    }

    function test_AumFee_FullYear() public view {
        assertEq(fee.aumFee(1_000_000e6, 365 days), 20_000e6);
    }

    function test_AumFee_HalfYear() public view {
        uint256 half = fee.aumFee(1_000_000e6, 365 days / 2);
        assertApproxEqAbs(half, 10_000e6, 1e6);
    }

    function test_SplitFee_70_20_10() public view {
        FeeModule.FeeSplit memory s = fee.splitFee(100e6);
        assertEq(s.protocolUsdg, 20e6);
        assertEq(s.stakerUsdg, 10e6);
        assertEq(s.leaderUsdg, 70e6);
        assertEq(s.protocolUsdg + s.leaderUsdg + s.stakerUsdg, 100e6);
    }

    function test_SplitFee_ZeroStakerIs80_20() public {
        fee.setParams(
            FeeModule.FeeParams({
                performanceFeeBps: 1_000,
                aumFeeBpsPerYear: 200,
                protocolShareBps: 2_000,
                stakerShareBps: 0
            })
        );
        FeeModule.FeeSplit memory s = fee.splitFee(100e6);
        assertEq(s.protocolUsdg, 20e6);
        assertEq(s.stakerUsdg, 0);
        assertEq(s.leaderUsdg, 80e6);
    }

    function test_SetParams_OnlyOwner() public {
        FeeModule f2 = new FeeModule(
            address(0xBEEF),
            FeeModule.FeeParams({
                performanceFeeBps: 0,
                aumFeeBpsPerYear: 0,
                protocolShareBps: 0,
                stakerShareBps: 0
            })
        );
        vm.expectRevert();
        f2.setParams(
            FeeModule.FeeParams({
                performanceFeeBps: 1,
                aumFeeBpsPerYear: 1,
                protocolShareBps: 1,
                stakerShareBps: 1
            })
        );
    }

    function test_SetParams_RejectsAbove100() public {
        vm.expectRevert(bytes("perf>100%"));
        fee.setParams(
            FeeModule.FeeParams({
                performanceFeeBps: 10_001,
                aumFeeBpsPerYear: 0,
                protocolShareBps: 0,
                stakerShareBps: 0
            })
        );
    }

    function test_SetParams_RejectsSplitAbove100() public {
        vm.expectRevert(bytes("split>100%"));
        fee.setParams(
            FeeModule.FeeParams({
                performanceFeeBps: 0,
                aumFeeBpsPerYear: 0,
                protocolShareBps: 6_000,
                stakerShareBps: 5_000
            })
        );
    }
}
