// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {DeskVault} from "./DeskVault.sol";
import {IRiskModule} from "./interfaces/IRiskModule.sol";
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";

/// @title DeskFactory
/// @notice Deploys exactly one DeskVault per leader. The factory owner also owns
///         the created vaults (governance/operator control in Phase 0).
contract DeskFactory is Ownable {
    address public immutable usdg;
    IRiskModule public immutable riskModule;
    ISwapAdapter public immutable swapAdapter;

    /// @dev leader => vault.
    mapping(address => address) public deskOf;
    address[] public allDesks;

    event DeskCreated(address indexed leader, address indexed vault);

    error DeskExists(address leader);

    constructor(
        address initialOwner,
        address usdg_,
        IRiskModule riskModule_,
        ISwapAdapter swapAdapter_
    ) Ownable(initialOwner) {
        require(usdg_ != address(0), "usdg=0");
        usdg = usdg_;
        riskModule = riskModule_;
        swapAdapter = swapAdapter_;
    }

    function createDesk(address leader) external onlyOwner returns (address vault) {
        require(leader != address(0), "leader=0");
        if (deskOf[leader] != address(0)) revert DeskExists(leader);

        DeskVault desk = new DeskVault(owner(), usdg, riskModule, swapAdapter, leader);
        vault = address(desk);
        deskOf[leader] = vault;
        allDesks.push(vault);
        emit DeskCreated(leader, vault);
    }

    function deskCount() external view returns (uint256) {
        return allDesks.length;
    }
}
