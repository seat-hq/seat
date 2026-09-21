// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {DeskVault} from "../src/DeskVault.sol";
import {FeeModule} from "../src/FeeModule.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {SwapAdapter} from "../src/SwapAdapter.sol";
import {IRiskModule} from "../src/interfaces/IRiskModule.sol";
import {MockERC20, MockOracle, MockRouter} from "./mocks/Mocks.sol";

contract DeskVaultLiveTest is Test {
    MockERC20 internal usdg;
    MockERC20 internal nvda;
    MockOracle internal oracle;
    MockRouter internal router;
    RiskModule internal risk;
    SwapAdapter internal swap;
    FeeModule internal fees;
    DeskVault internal vault;

    address internal leader = makeAddr("leader");
    address internal keeper = makeAddr("keeper");
    address internal alice = makeAddr("alice");
    address internal proto = makeAddr("protocol");

    function setUp() public {
        usdg = new MockERC20("USD Gateway", "USDG", 6);
        nvda = new MockERC20("NVDA", "NVDA", 18);
        oracle = new MockOracle();
        router = new MockRouter(usdg);
        risk = new RiskModule(address(this));
        swap = new SwapAdapter(address(this));
        fees = new FeeModule(
            address(this),
            FeeModule.FeeParams({
                performanceFeeBps: 1_000,
                aumFeeBpsPerYear: 200,
                protocolShareBps: 2_000,
                stakerShareBps: 0
            })
        );
        vault = new DeskVault(address(this), address(usdg), risk, swap, leader);

        oracle.set(address(nvda), 120_00000000, 8, block.timestamp);
        router.setUsdgPerWhole(address(nvda), 120e6);

        swap.setRouter(address(router));
        swap.setAllowedToken(address(usdg), true);
        swap.setAllowedToken(address(nvda), true);

        risk.configureDesk(address(vault), 2_000e6, 5_000e6, 10_000e6, 2_000, 120);
        risk.setTokenAllowed(address(vault), address(nvda), true);
        risk.setSessionRisk(address(vault), IRiskModule.Session.Regular, 10_000);

        vault.setKeeper(keeper);
        vault.setOracle(oracle);
        vault.setFeeModule(fees);
        vault.setFeeRecipients(proto, leader, address(0));

        usdg.mint(alice, 2_000_000e6);
        vm.prank(alice);
        usdg.approve(address(vault), type(uint256).max);
    }

    function _deposit(uint256 amt) internal {
        vm.prank(alice);
        vault.deposit(amt);
    }

    function _minTok(uint256 usdgAmt) internal pure returns (uint256) {
        return (usdgAmt * 1e18) / uint256(120e6);
    }

    function test_CopyBuy_NavExceedsCash() public {
        _deposit(10_000e6);
        vm.prank(keeper);
        vault.executeCopy(
            address(nvda), true, 1_000e6, IRiskModule.Session.Regular, block.timestamp, _minTok(1_000e6)
        );

        assertEq(vault.cashUsdg(), 9_000e6);
        assertGt(vault.totalAssetsUsdg(), vault.cashUsdg());
        assertEq(vault.heldTokenCount(), 1);
        // 1000 USDG at $120 -> 1000/120 tokens; value ~= 1000 USDG so NAV ~ 10k
        assertApproxEqAbs(vault.totalAssetsUsdg(), 10_000e6, 2);
    }

    function test_CopySell_ReturnsCash() public {
        _deposit(10_000e6);
        vm.prank(keeper);
        vault.executeCopy(
            address(nvda), true, 1_000e6, IRiskModule.Session.Regular, block.timestamp, _minTok(1_000e6)
        );

        uint256 tokens = nvda.balanceOf(address(vault));
        uint256 minUsdg = (tokens * 120e6) / 1e18;
        vm.prank(keeper);
        vault.executeCopy(
            address(nvda), false, 1_000e6, IRiskModule.Session.Regular, block.timestamp, minUsdg
        );
        assertApproxEqAbs(vault.cashUsdg(), 10_000e6, 2);
        assertLt(nvda.balanceOf(address(vault)), 1e10);
    }

    function test_MinAmountOutZero_Reverts() public {
        _deposit(1_000e6);
        vm.prank(keeper);
        vm.expectRevert(DeskVault.ZeroMinOut.selector);
        vault.executeCopy(
            address(nvda), true, 100e6, IRiskModule.Session.Regular, block.timestamp, 0
        );
    }

    function test_StaleOracle_RevertsOnNav() public {
        _deposit(5_000e6);
        vm.prank(keeper);
        vault.executeCopy(
            address(nvda), true, 500e6, IRiskModule.Session.Regular, block.timestamp, _minTok(500e6)
        );
        oracle.set(address(nvda), 120_00000000, 8, block.timestamp);
        vm.warp(block.timestamp + 1_000);
        vm.expectRevert(DeskVault.StalePrice.selector);
        vault.totalAssetsUsdg();
    }

    function test_AumFee_AccruesAndPays() public {
        _deposit(1_000_000e6);
        vm.warp(block.timestamp + 365 days);
        uint256 protoBefore = usdg.balanceOf(proto);
        vm.prank(alice);
        vault.deposit(1);
        // ~2% of 1M = 20_000; 20% protocol
        assertGt(usdg.balanceOf(proto), protoBefore);
        assertGt(usdg.balanceOf(leader), 0);
    }

    function test_PerformanceFee_OnHighWater() public {
        _deposit(10_000e6);
        vm.prank(keeper);
        vault.executeCopy(
            address(nvda), true, 1_000e6, IRiskModule.Session.Regular, block.timestamp, _minTok(1_000e6)
        );
        // Mark tokens up 20% => profit, next deposit accrues perf fee
        oracle.set(address(nvda), 144_00000000, 8, block.timestamp);
        uint256 protoBefore = usdg.balanceOf(proto);
        vm.prank(alice);
        vault.deposit(1e6);
        assertGe(usdg.balanceOf(proto), protoBefore);
    }

    function test_RedeemQueued_WhenCashInTokens() public {
        _deposit(2_000e6);
        vm.prank(keeper);
        vault.executeCopy(
            address(nvda), true, 1_800e6, IRiskModule.Session.Regular, block.timestamp, _minTok(1_800e6)
        );
        // Almost all cash is in tokens; redeem most shares => queue
        vm.prank(alice);
        vault.redeem(1_500e6);
        assertGt(vault.withdrawQueueLength(), 0);
    }

    function test_NonKeeper_Reverts() public {
        vm.prank(alice);
        vm.expectRevert(DeskVault.NotKeeper.selector);
        vault.executeCopy(
            address(nvda), true, 100e6, IRiskModule.Session.Regular, block.timestamp, 1
        );
    }

    function test_UnallowedToken_RiskRejects() public {
        _deposit(1_000e6);
        address other = address(new MockERC20("X", "X", 18));
        vm.prank(keeper);
        vm.expectRevert(bytes("risk rejected"));
        vault.executeCopy(other, true, 100e6, IRiskModule.Session.Regular, block.timestamp, 1);
    }
}
