// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeskVault} from "../src/DeskVault.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SeatToken} from "../src/SeatToken.sol";
import {StakingPool} from "../src/StakingPool.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {IRiskModule} from "../src/interfaces/IRiskModule.sol";
import {MockERC20} from "./mocks/Mocks.sol";

contract StakingPoolTest is Test {
    MockERC20 internal usdg;
    SeatToken internal seat;
    StakingPool internal pool;
    RiskModule internal risk;
    SwapAdapter internal swap;
    FeeModule internal fees;
    DeskVault internal vault;

    address internal holder = makeAddr("holder");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal leader = makeAddr("leader");
    address internal proto = makeAddr("protocol");
    address internal keeper = makeAddr("keeper");

    function setUp() public {
        usdg = new MockERC20("USDG", "USDG", 6);
        vm.prank(holder);
        seat = new SeatToken(holder);

        pool = new StakingPool(address(seat), address(usdg));
        risk = new RiskModule(address(this));
        swap = new SwapAdapter(address(this));
        fees = new FeeModule(
            address(this),
            FeeModule.FeeParams({
                performanceFeeBps: 1_000,
                aumFeeBpsPerYear: 200,
                protocolShareBps: 2_000,
                stakerShareBps: 1_000
            })
        );
        vault = new DeskVault(address(this), address(usdg), risk, swap, leader);
        vault.setFeeModule(fees);
        vault.setFeeRecipients(proto, leader, address(pool));
        vault.setKeeper(keeper);
        risk.configureDesk(address(vault), 2_000e6, 5_000e6, 10_000e6, 2_000, 120);
        risk.setSessionRisk(address(vault), IRiskModule.Session.Regular, 10_000);

        usdg.mint(alice, 2_000_000e6);
        vm.prank(alice);
        usdg.approve(address(vault), type(uint256).max);

        vm.startPrank(holder);
        seat.transfer(alice, 100_000 ether);
        seat.transfer(bob, 100_000 ether);
        vm.stopPrank();
        vm.prank(alice);
        seat.approve(address(pool), type(uint256).max);
        vm.prank(bob);
        seat.approve(address(pool), type(uint256).max);
    }

    function test_StakeNotifyClaim() public {
        vm.prank(alice);
        pool.stake(40_000 ether);
        vm.prank(bob);
        pool.stake(10_000 ether);

        vm.prank(alice);
        vault.deposit(1_000_000e6);
        vm.warp(block.timestamp + 365 days);
        vm.prank(alice);
        vault.deposit(1);

        // ~2% of 1M = 20_000; 10% stakers = 2_000 USDG
        uint256 alicePending = pool.pendingUsdg(alice);
        uint256 bobPending = pool.pendingUsdg(bob);
        assertGt(alicePending, 0);
        assertGt(bobPending, 0);
        assertApproxEqAbs(alicePending, bobPending * 4, 10);

        uint256 before = usdg.balanceOf(alice);
        vm.prank(alice);
        pool.claim();
        assertGt(usdg.balanceOf(alice), before);
        assertEq(pool.pendingUsdg(alice), 0);
    }

    function test_UnstakeStopsAccrual() public {
        vm.prank(alice);
        pool.stake(50_000 ether);
        usdg.mint(address(this), 1_000e6);
        usdg.approve(address(pool), type(uint256).max);
        pool.notifyReward(1_000e6);

        vm.prank(alice);
        pool.unstake(50_000 ether);
        assertEq(pool.stakedOf(alice), 0);

        usdg.mint(address(this), 1_000e6);
        usdg.approve(address(pool), 1_000e6);
        pool.notifyReward(1_000e6);
        assertEq(pool.pendingUsdg(alice), 0);
    }

    function test_NotifyWithNoStake_HoldsThenFolds() public {
        usdg.mint(address(this), 500e6);
        usdg.approve(address(pool), type(uint256).max);
        pool.notifyReward(500e6);
        assertEq(pool.undistributedUsdg(), 500e6);

        vm.prank(alice);
        pool.stake(10_000 ether);
        assertEq(pool.undistributedUsdg(), 0);
        uint256 before = usdg.balanceOf(alice);
        vm.prank(alice);
        pool.claim();
        assertEq(usdg.balanceOf(alice), before + 500e6);
    }

    function test_StakerSliceHeldWhenRecipientZero() public {
        vault.setFeeRecipients(proto, leader, address(0));
        vm.prank(alice);
        vault.deposit(1_000_000e6);
        vm.warp(block.timestamp + 365 days);
        vm.prank(alice);
        vault.deposit(1);

        // 2% AUM of ~1M = 20_000; 10% staker slice stays as liability.
        assertGt(vault.feeLiabilitiesUsdg(), 0);
        assertEq(usdg.balanceOf(address(pool)), 0);
        assertEq(pool.undistributedUsdg(), 0);
    }

    function test_ZeroStake_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(StakingPool.ZeroAmount.selector);
        pool.stake(0);
    }
}
