// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DebtToken is ERC20 {

     address public underlyingToken;  // e.g. the USDC contract address
    address public lendingPool;      // only this address can mint/burn

    constructor(
        string memory name,        // e.g. "Aave USDC Debt"
        string memory symbol,      // e.g. "dUSDC"
        address _underlyingToken,
        address _lendingPool
    ) ERC20(name, symbol) {
        underlyingToken = _underlyingToken;
        lendingPool = _lendingPool;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == lendingPool, "Only the lending pool can mint tokens");
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        require(msg.sender == lendingPool, "Only the lending pool can burn tokens");
        _burn(from, amount);
    }

    function transfer(address, uint256) public pure override returns (bool) {
        revert("Debt tokens are non-transferable");
    }

    function transferFrom(address, address, uint256) public pure override returns (bool) {
        revert("Debt tokens are non-transferable");
    }

}