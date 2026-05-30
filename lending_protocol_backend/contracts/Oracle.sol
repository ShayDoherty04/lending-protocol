// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

contract Oracle {

    address owner;
    mapping(address => uint256) private price;
    mapping(address => address) public priceFeeds;

    constructor() {
        // Initialize with some default prices if needed
        owner = msg.sender;
    }

    function setPrice(address _token, uint256 _price) external {
        require(msg.sender == owner, "Only owner can set price");
        price[_token] = _price;
    }

    function getPrice(address _token) external view returns (uint256) {
        if (priceFeeds[_token] != address(0)) {
            (, int256 priceInt,,,) = AggregatorV3Interface(priceFeeds[_token]).latestRoundData();
            return uint256(priceInt);
        }
        return price[_token];
    }

    function setPriceFeed(address _token, address _feed) external {
        priceFeeds[_token] = _feed;
    }
}