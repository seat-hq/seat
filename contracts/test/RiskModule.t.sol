// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {RiskModule} from "../src/RiskModule.sol";
import {IRiskModule} from "../src/interfaces/IRiskModule.sol";

contract RiskModuleTest is Test {
    RiskModule internal risk;
    address internal desk = address(0xD35C);
    address internal token = address(0x7011);

    function setUp() public {
        risk = new RiskModule(address(this));
        risk.configureDesk(desk, 2_000e6, 5_000e6, 10_000e6, 2_000, 120);
        risk.setTokenAllowed(desk, token, true);
        risk.setSessionRisk(desk, IRiskModule.Session.Regular, 10_000);
        risk.setSessionRisk(desk, IRiskModule.Session.AfterHours, 3_000);
    }

    function _input(
        bool isBuy,
        uint256 size,
        uint256 posVal,
        uint256 gross,
        IRiskModule.Session session
    ) internal view returns (IRiskModule.CheckInput memory) {
        return IRiskModule.CheckInput({
            desk: desk,
            token: token,
            isBuy: isBuy,
            sizeUsdg: size,
            positionValueUsdg: posVal,
            grossExposureUsdg: gross,
            navPerShare: 1e6,
            highWaterNavPerShare: 1e6,
            session: session,
            priceUpdatedAt: 1_000,
            nowTs: 1_000
        });
    }

    function test_NotConfigured_Reject() public {
        RiskModule fresh = new RiskModule(address(this));
        (IRiskModule.Decision d,, string memory r) = fresh.evaluate(_input(true, 1e6, 0, 0, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "desk not configured");
    }

    function test_TokenNotAllowed_Reject() public {
        risk.setTokenAllowed(desk, token, false);
        (IRiskModule.Decision d,,) = risk.evaluate(_input(true, 1e6, 0, 0, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
    }

    function test_SessionClosed_Reject() public view {
        (IRiskModule.Decision d,, string memory r) = risk.evaluate(_input(true, 1e6, 0, 0, IRiskModule.Session.Closed));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "session closed");
    }

    function test_SessionNotTradable_Reject() public view {
        // PreMarket has no bps configured => 0 => not tradable.
        (IRiskModule.Decision d,, string memory r) = risk.evaluate(_input(true, 1e6, 0, 0, IRiskModule.Session.PreMarket));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "session not tradable");
    }

    function test_StalePrice_Reject() public {
        IRiskModule.CheckInput memory input = _input(true, 1e6, 0, 0, IRiskModule.Session.Regular);
        input.nowTs = 2_000; // age 1000 > 120
        (IRiskModule.Decision d,, string memory r) = risk.evaluate(input);
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "price stale");
    }

    function test_DrawdownHalt_Reject() public view {
        IRiskModule.CheckInput memory input = _input(true, 1e6, 0, 0, IRiskModule.Session.Regular);
        // 25% drawdown from high water, threshold 20% => halt.
        // navPerShare set below high water.
        input = IRiskModule.CheckInput({
            desk: desk,
            token: token,
            isBuy: true,
            sizeUsdg: 1e6,
            positionValueUsdg: 0,
            grossExposureUsdg: 0,
            navPerShare: 75e4,
            highWaterNavPerShare: 1e6,
            session: IRiskModule.Session.Regular,
            priceUpdatedAt: 1_000,
            nowTs: 1_000
        });
        (IRiskModule.Decision d,, string memory r) = risk.evaluate(input);
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "drawdown halt");
    }

    function test_Accept_FullSize() public view {
        (IRiskModule.Decision d, uint256 allowed,) = risk.evaluate(_input(true, 1_000e6, 0, 0, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Accept));
        assertEq(allowed, 1_000e6);
    }

    function test_Accept_CappedByMaxFill() public view {
        (IRiskModule.Decision d, uint256 allowed,) = risk.evaluate(_input(true, 5_000e6, 0, 0, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Accept));
        assertEq(allowed, 2_000e6); // maxFillUsdg
    }

    function test_AfterHours_SmallerThanRegular() public view {
        (, uint256 reg,) = risk.evaluate(_input(true, 1_000e6, 0, 0, IRiskModule.Session.Regular));
        (, uint256 aft,) = risk.evaluate(_input(true, 1_000e6, 0, 0, IRiskModule.Session.AfterHours));
        assertLt(aft, reg);
        assertEq(aft, 300e6); // 30% of 1000
    }

    function test_PositionCap_Reject() public view {
        (IRiskModule.Decision d,, string memory r) = risk.evaluate(_input(true, 1_000e6, 5_000e6, 5_000e6, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "position cap reached");
    }

    function test_PositionCap_Resize() public view {
        // Position headroom 500 => allowed 500 even though requested 1000.
        (IRiskModule.Decision d, uint256 allowed,) = risk.evaluate(_input(true, 1_000e6, 4_500e6, 4_500e6, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Accept));
        assertEq(allowed, 500e6);
    }

    function test_Sell_NoPosition_Reject() public view {
        (IRiskModule.Decision d,, string memory r) = risk.evaluate(_input(false, 1_000e6, 0, 0, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Reject));
        assertEq(r, "no position to sell");
    }

    function test_Sell_CappedByPosition() public view {
        (IRiskModule.Decision d, uint256 allowed,) = risk.evaluate(_input(false, 1_000e6, 300e6, 300e6, IRiskModule.Session.Regular));
        assertEq(uint256(d), uint256(IRiskModule.Decision.Accept));
        assertEq(allowed, 300e6);
    }

    function test_OnlyOwner_Configure() public {
        RiskModule r2 = new RiskModule(address(0xABCD));
        vm.expectRevert();
        r2.configureDesk(desk, 1, 1, 1, 1, 1);
    }
}
