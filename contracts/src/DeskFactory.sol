// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {DeskVault} from "./DeskVault.sol";
import {IRiskModule} from "./interfaces/IRiskModule.sol";
import {ISwapAdapter} from "./interfaces/ISwapAdapter.sol";

/// @title DeskFactory
/// @notice One DeskVault per leader. Owner may createDesk with no bond.
///         Anyone may listDesk by posting a $SEAT listing bond.
contract DeskFactory is Ownable {
    using SafeERC20 for IERC20;

    address public immutable usdg;
    IRiskModule public immutable riskModule;
    ISwapAdapter public immutable swapAdapter;

    IERC20 public seatToken;
    uint256 public listingBondSeat;

    /// @dev leader => vault.
    mapping(address => address) public deskOf;
    address[] public allDesks;
    /// @dev vault => posted $SEAT bond.
    mapping(address => uint256) public bondOf;
    /// @dev vault => who posted the bond.
    mapping(address => address) public bonderOf;

    event DeskCreated(address indexed leader, address indexed vault);
    event ListingParamsSet(address indexed seat, uint256 bond);
    event BondPosted(address indexed vault, address indexed bonder, uint256 amount);
    event BondReturned(address indexed vault, address indexed bonder, uint256 amount);

    error DeskExists(address leader);
    error ListingNotConfigured();
    error NoBond();

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

    function setListingParams(address seat, uint256 bond) external onlyOwner {
        seatToken = IERC20(seat);
        listingBondSeat = bond;
        emit ListingParamsSet(seat, bond);
    }

    function createDesk(address leader) external onlyOwner returns (address vault) {
        vault = _deployDesk(leader);
    }

    function listDesk(address leader) external returns (address vault) {
        if (address(seatToken) == address(0) || listingBondSeat == 0) {
            revert ListingNotConfigured();
        }
        seatToken.safeTransferFrom(msg.sender, address(this), listingBondSeat);
        vault = _deployDesk(leader);
        bondOf[vault] = listingBondSeat;
        bonderOf[vault] = msg.sender;
        emit BondPosted(vault, msg.sender, listingBondSeat);
    }

    function returnBond(address vault) external onlyOwner {
        uint256 amt = bondOf[vault];
        address bonder = bonderOf[vault];
        if (amt == 0 || bonder == address(0)) revert NoBond();
        bondOf[vault] = 0;
        bonderOf[vault] = address(0);
        seatToken.safeTransfer(bonder, amt);
        emit BondReturned(vault, bonder, amt);
    }

    function deskCount() external view returns (uint256) {
        return allDesks.length;
    }

    function _deployDesk(address leader) internal returns (address vault) {
        require(leader != address(0), "leader=0");
        if (deskOf[leader] != address(0)) revert DeskExists(leader);

        DeskVault desk = new DeskVault(owner(), usdg, riskModule, swapAdapter, leader);
        vault = address(desk);
        deskOf[leader] = vault;
        allDesks.push(vault);
        emit DeskCreated(leader, vault);
    }
}
