// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice Chainlink AggregatorV3 as documented on Robinhood Chain oracles page.
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}
