// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @title IDeskVault
/// @notice USDG-denominated desk vault. Depositors receive seat shares; NAV is
///         computed in USDG. Withdrawals are instant when cash is available,
///         otherwise queued.
interface IDeskVault {
    event Deposit(address indexed user, uint256 assetsUsdg, uint256 shares);
    event Redeem(address indexed user, uint256 shares, uint256 assetsUsdg);
    event WithdrawQueued(address indexed user, uint256 id, uint256 assetsUsdg);
    event WithdrawFulfilled(address indexed user, uint256 id, uint256 assetsUsdg);

    /// @notice The USDG accounting asset.
    function asset() external view returns (address);

    /// @notice Total outstanding seat shares.
    function totalShares() external view returns (uint256);

    /// @notice Total desk assets (NAV) in USDG base units.
    function totalAssetsUsdg() external view returns (uint256);

    /// @notice Deposit USDG, minting seat shares. Returns shares minted.
    function deposit(uint256 assetsUsdg) external returns (uint256 shares);

    /// @notice Redeem seat shares for USDG. Returns assets owed (paid or queued).
    function redeem(uint256 shares) external returns (uint256 assetsUsdg);
}
