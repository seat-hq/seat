// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AggregatorV3Interface} from "./interfaces/AggregatorV3Interface.sol";
import {IPriceOracle} from "./libraries/NavLib.sol";

/// @title ChainlinkOracle
/// @notice token => AggregatorV3 proxy. Owner maps feeds from a cited source
///         only (docs/phase-1-live.md). Unmapped tokens revert.
contract ChainlinkOracle is IPriceOracle, Ownable {
    mapping(address => address) public feedOf;

    error NoFeed(address token);
    error BadPrice(address token);

    event FeedSet(address indexed token, address indexed feed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setFeed(address token, address feed) external onlyOwner {
        require(token != address(0), "token=0");
        feedOf[token] = feed;
        emit FeedSet(token, feed);
    }

    function price(address token)
        external
        view
        returns (uint256 value, uint8 decimals, uint256 updatedAt)
    {
        address feed = feedOf[token];
        if (feed == address(0)) revert NoFeed(token);
        (, int256 answer,, uint256 updated,) = AggregatorV3Interface(feed).latestRoundData();
        if (answer <= 0 || updated == 0) revert BadPrice(token);
        return (uint256(answer), AggregatorV3Interface(feed).decimals(), updated);
    }
}
