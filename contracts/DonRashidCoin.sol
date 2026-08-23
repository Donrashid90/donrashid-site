// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Don Rashid Coin
/// @notice Fixed-supply access token for the free-play Don Rashid Arcade.
/// @dev There are no privileged controls or post-deployment supply changes.
contract DonRashidCoin is ERC20 {
    uint256 public constant MAX_SUPPLY = 10_000_000 ether;

    constructor() ERC20("Don Rashid Coin", "DRC") {
        _mint(msg.sender, MAX_SUPPLY);
    }
}
