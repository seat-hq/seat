// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, stdStorage, StdStorage} from "forge-std/Test.sol";
import {DeskVault} from "../src/DeskVault.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {IRiskModule} from "../src/interfaces/IRiskModule.sol";
import {MockERC20} from "./mocks/Mocks.sol";

contract DeskVaultTest is Test {
    using stdStorage for StdStorage;
    MockERC20 internal usdg;
    RiskModule internal risk;
    SwapAdapter internal swap;
    DeskVault internal vault;

    address internal leader = makeAddr("leader");
    address internal keeper = makeAddr("keeper");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal token = makeAddr("nvda");

    function setUp() public {
        usdg = new MockERC20("USD Gateway", "USDG", 6);
        risk = new RiskModule(address(this));
        swap = new SwapAdapter(address(this));
        vault = new DeskVault(address(this), address(usdg), risk, swap, leader);

        risk.configureDesk(address(vault), 2_000e6, 5_000e6, 10_000e6, 2_000, 120);
        risk.setTokenAllowed(address(vault), token, true);
        risk.setSessionRisk(address(vault), IRiskModule.Session.Regular, 10_000);
        vault.setKeeper(keeper);

        usdg.mint(alice, 10_000e6);
        usdg.mint(bob, 10_000e6);
        vm.prank(alice);
        usdg.approve(address(vault), type(uint256).max);
        vm.prank(bob);
        usdg.approve(address(vault), type(uint256).max);
    }

    function _deposit(address who, uint256 amount) internal returns (uint256) {
        vm.prank(who);
        return vault.deposit(amount);
    }

    function test_Deposit_Bootstrap1to1() public {
        uint256 shares = _deposit(alice, 1_000e6);
        assertEq(shares, 1_000e6);
        assertEq(vault.totalShares(), 1_000e6);
        assertEq(vault.totalAssetsUsdg(), 1_000e6);
        assertEq(vault.navPerShare(), 1e6);
    }

    function test_Deposit_ProRata() public {
        _deposit(alice, 1_000e6);
        uint256 bobShares = _deposit(bob, 500e6);
        assertEq(bobShares, 500e6);
        assertEq(vault.totalShares(), 1_500e6);
        assertEq(vault.totalAssetsUsdg(), 1_500e6);
    }

    function test_Redeem_Instant() public {
        _deposit(alice, 1_000e6);
        uint256 before = usdg.balanceOf(alice);
        vm.prank(alice);
        uint256 assets = vault.redeem(1_000e6);
        assertEq(assets, 1_000e6);
        assertEq(usdg.balanceOf(alice), before + 1_000e6);
        assertEq(vault.totalShares(), 0);
        assertEq(vault.totalAssetsUsdg(), 0);
    }

    function test_Redeem_Queued_WhenPaused_ThenProcessed() public {
        _deposit(alice, 1_000e6);
        vault.pause();

        vm.prank(alice);
        uint256 assets = vault.redeem(400e6);
        assertEq(assets, 400e6);
        assertEq(vault.withdrawQueueLength(), 1);
        // Cash not yet released while queued.
        assertEq(vault.totalAssetsUsdg(), 1_000e6);

        vault.unpause();
        uint256 before = usdg.balanceOf(alice);
        vault.processWithdrawals(10);
        assertEq(usdg.balanceOf(alice), before + 400e6);
        assertEq(vault.totalAssetsUsdg(), 600e6);
    }

    function test_Redeem_InsufficientShares_Reverts() public {
        _deposit(alice, 1_000e6);
        vm.prank(bob);
        vm.expectRevert(DeskVault.InsufficientShares.selector);
        vault.redeem(1);
    }

    function test_Deposit_Paused_Reverts() public {
        vault.pause();
        vm.prank(alice);
        vm.expectRevert();
        vault.deposit(1_000e6);
    }

    function test_ExecuteCopy_FailsClosed_Phase0() public {
        _deposit(alice, 5_000e6);
        // Keeper submits a valid copy; risk accepts, but the SwapAdapter has no
        // router configured, so execution reverts (fail closed).
        vm.prank(keeper);
        vm.expectRevert(SwapAdapter.RouterNotConfigured.selector);
        vault.executeCopy(token, true, 1_000e6, IRiskModule.Session.Regular, block.timestamp);
    }

    function test_ExecuteCopy_OnlyKeeper() public {
        vm.prank(alice);
        vm.expectRevert(DeskVault.NotKeeper.selector);
        vault.executeCopy(token, true, 1_000e6, IRiskModule.Session.Regular, block.timestamp);
    }

    function test_Pause_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.pause();
    }

    function test_NavEqualsCash_NoPositions() public {
        _deposit(alice, 1_234e6);
        assertEq(vault.totalAssetsUsdg(), vault.cashUsdg());
        assertEq(vault.totalAssetsUsdg(), 1_234e6);
    }

    function test_ProcessWithdrawals_MultiRequest() public {
        _deposit(alice, 1_000e6);
        _deposit(bob, 1_000e6);
        vault.pause();

        vm.prank(alice);
        uint256 aliceAssets = vault.redeem(400e6);
        vm.prank(bob);
        uint256 bobAssets = vault.redeem(300e6);

        assertEq(vault.withdrawQueueLength(), 2);
        // Shares burn on queue; cash stays until processWithdrawals.
        assertEq(vault.totalAssetsUsdg(), 2_000e6);

        vault.unpause();
        uint256 aliceBefore = usdg.balanceOf(alice);
        uint256 bobBefore = usdg.balanceOf(bob);
        vault.processWithdrawals(10);

        assertEq(usdg.balanceOf(alice), aliceBefore + aliceAssets);
        assertEq(usdg.balanceOf(bob), bobBefore + bobAssets);
        assertEq(vault.totalAssetsUsdg(), 2_000e6 - aliceAssets - bobAssets);
        assertEq(vault.queueHead(), 2);
    }

    function test_ProcessWithdrawals_PartialByMaxCount() public {
        _deposit(alice, 1_000e6);
        vault.pause();

        vm.prank(alice);
        uint256 first = vault.redeem(400e6);
        vm.prank(alice);
        uint256 second = vault.redeem(300e6);
        assertEq(vault.withdrawQueueLength(), 2);

        vault.unpause();
        uint256 before = usdg.balanceOf(alice);
        vault.processWithdrawals(1);

        assertEq(usdg.balanceOf(alice), before + first);
        assertEq(vault.queueHead(), 1);
        assertEq(vault.totalAssetsUsdg(), 1_000e6 - first);

        vault.processWithdrawals(1);
        assertEq(usdg.balanceOf(alice), before + first + second);
        assertEq(vault.queueHead(), 2);
        assertEq(vault.totalAssetsUsdg(), 1_000e6 - first - second);
    }

    function test_ProcessWithdrawals_StopsWhenCashShort() public {
        _deposit(alice, 1_000e6);
        vault.pause();

        vm.prank(alice);
        vault.redeem(700e6);
        vm.prank(alice);
        vault.redeem(300e6);
        vault.unpause();

        // Simulate cash consumed by a later-phase position: only 500 left,
        // not enough for the 700 head. FIFO stops; neither request pays.
        stdstore.target(address(vault)).sig("cashUsdg()").checked_write(uint256(500e6));
        assertEq(vault.cashUsdg(), 500e6);

        uint256 before = usdg.balanceOf(alice);
        vault.processWithdrawals(10);
        assertEq(usdg.balanceOf(alice), before);
        assertEq(vault.queueHead(), 0);
        assertEq(vault.withdrawQueueLength(), 2);
    }
}
