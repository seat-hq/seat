// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Minimal oracle interface used for NAV valuation. Returns the price of
///         one whole token expressed in USDG, its decimals, and last-update time.
interface IPriceOracle {
    function price(address token)
        external
        view
        returns (uint256 value, uint8 decimals, uint256 updatedAt);
}

/// @title NavLib
/// @notice Fixed-point NAV math in USDG base units. No floating point. Mirrors
///         the SDK's `nav.ts`. Multiplication precedes division to preserve
///         precision; division truncates toward zero.
library NavLib {
    error ZeroPrice();

    /// @notice Value a position in USDG base units:
    ///         value = uiBalance * price * 10^usdgDec / (10^tokenDec * 10^priceDec)
    function valuePosition(
        uint256 uiBalance,
        uint8 tokenDecimals,
        uint256 price,
        uint8 priceDecimals,
        uint8 usdgDecimals
    ) internal pure returns (uint256) {
        if (price == 0) revert ZeroPrice();
        uint256 numerator = uiBalance * price * (10 ** usdgDecimals);
        uint256 denominator = (10 ** uint256(tokenDecimals)) * (10 ** uint256(priceDecimals));
        return numerator / denominator;
    }

    /// @notice Desk equity = cash + positions - liabilities (USDG base units).
    function equity(
        uint256 cashUsdg,
        uint256 positionsValueUsdg,
        uint256 liabilitiesUsdg
    ) internal pure returns (uint256) {
        return cashUsdg + positionsValueUsdg - liabilitiesUsdg;
    }

    /// @notice NAV per share scaled to `sharePrecision` decimals. 0 when no shares.
    function navPerShare(
        uint256 equityUsdg,
        uint256 totalShares,
        uint8 sharePrecision
    ) internal pure returns (uint256) {
        if (totalShares == 0) return 0;
        return (equityUsdg * (10 ** uint256(sharePrecision))) / totalShares;
    }

    /// @notice Shares minted for a deposit. Bootstraps 1:1 (shares == USDG units)
    ///         when the desk is empty; otherwise pro-rata to equity.
    function sharesForDeposit(
        uint256 assetsUsdg,
        uint256 totalShares,
        uint256 equityUsdg
    ) internal pure returns (uint256) {
        if (totalShares == 0 || equityUsdg == 0) {
            return assetsUsdg;
        }
        return (assetsUsdg * totalShares) / equityUsdg;
    }

    /// @notice Assets owed for redeeming shares, pro-rata to equity.
    function assetsForRedeem(
        uint256 shares,
        uint256 totalShares,
        uint256 equityUsdg
    ) internal pure returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares * equityUsdg) / totalShares;
    }
}
