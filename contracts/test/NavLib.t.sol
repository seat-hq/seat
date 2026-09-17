// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {NavLib} from "../src/libraries/NavLib.sol";

/// @dev Exposes NavLib's internal functions for testing.
contract NavLibHarness {
    function valuePosition(
        uint256 uiBalance,
        uint8 tokenDecimals,
        uint256 price,
        uint8 priceDecimals,
        uint8 usdgDecimals
    ) external pure returns (uint256) {
        return NavLib.valuePosition(uiBalance, tokenDecimals, price, priceDecimals, usdgDecimals);
    }

    function equity(uint256 cash, uint256 pos, uint256 liab) external pure returns (uint256) {
        return NavLib.equity(cash, pos, liab);
    }

    function navPerShare(uint256 eq, uint256 shares, uint8 prec) external pure returns (uint256) {
        return NavLib.navPerShare(eq, shares, prec);
    }

    function sharesForDeposit(uint256 assets, uint256 shares, uint256 eq) external pure returns (uint256) {
        return NavLib.sharesForDeposit(assets, shares, eq);
    }

    function assetsForRedeem(uint256 shares, uint256 total, uint256 eq) external pure returns (uint256) {
        return NavLib.assetsForRedeem(shares, total, eq);
    }
}

contract NavLibTest is Test {
    NavLibHarness internal nav;

    function setUp() public {
        nav = new NavLibHarness();
    }

    function test_ValuePosition_OneToken() public view {
        // 1 token (1e18), price 120 (120e8, 8 dp), usdg 6dp => 120 USDG (120e6).
        uint256 v = nav.valuePosition(1e18, 18, 120e8, 8, 6);
        assertEq(v, 120e6);
    }

    function test_ValuePosition_Fractional() public view {
        // 0.5 token at 200.00 => 100 USDG.
        uint256 v = nav.valuePosition(5e17, 18, 200e8, 8, 6);
        assertEq(v, 100e6);
    }

    function test_ValuePosition_ZeroPriceReverts() public {
        vm.expectRevert(NavLib.ZeroPrice.selector);
        nav.valuePosition(1e18, 18, 0, 8, 6);
    }

    function test_Equity() public view {
        assertEq(nav.equity(1_000e6, 500e6, 100e6), 1_400e6);
    }

    function test_NavPerShare_ZeroShares() public view {
        assertEq(nav.navPerShare(1_000e6, 0, 6), 0);
    }

    function test_NavPerShare_Basic() public view {
        // equity 1000 USDG, 1000 shares (6dp) => 1.0 USDG/share == 1e6.
        assertEq(nav.navPerShare(1_000e6, 1_000e6, 6), 1e6);
    }

    function test_SharesForDeposit_Bootstrap() public view {
        assertEq(nav.sharesForDeposit(1_000e6, 0, 0), 1_000e6);
    }

    function test_SharesForDeposit_ProRata() public view {
        // Existing: 1000 shares for 1000 equity. Deposit 500 => 500 shares.
        assertEq(nav.sharesForDeposit(500e6, 1_000e6, 1_000e6), 500e6);
    }

    function test_RoundTrip_DepositRedeem() public view {
        uint256 shares = nav.sharesForDeposit(1_000e6, 0, 0);
        uint256 assets = nav.assetsForRedeem(shares, shares, 1_000e6);
        assertEq(assets, 1_000e6);
    }

    /// @dev Valuation must not overflow for reasonable magnitudes.
    function testFuzz_ValuePosition_NoOverflow(uint96 bal, uint64 price) public view {
        vm.assume(price > 0);
        uint256 v = nav.valuePosition(bal, 18, price, 8, 6);
        // Sanity: value is monotonic-ish and bounded by the closed-form.
        assertEq(v, (uint256(bal) * price * 1e6) / (1e18 * 1e8));
    }
}
