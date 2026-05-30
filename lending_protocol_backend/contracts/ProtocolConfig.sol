// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract ProtocolConfig {

    address owner;

    struct Config {
        uint256 LTV; // e.g., 150% = 15000 (using basis points)
        uint256 liquidationBonus; // e.g., 5% = 500 (using basis points)
        uint256 liquidationThreshold; // e.g., 10% = 1000 (using basis points)
        bool isSupported; // e.g., 10% = 1000 (using basis points)
    }

    mapping(address => Config) public tokenConfig;

    constructor() {
        owner = msg.sender;
    }

    function setConfig(
        address _token,
        uint256 _LTV,
        uint256 _liquidationBonus,
        uint256 _liquidationThreshold,
        bool _isSupported
    ) external {
        require(msg.sender == owner, "Only owner can set config");
        tokenConfig[_token] = Config({
            LTV: _LTV,
            liquidationBonus: _liquidationBonus,
            liquidationThreshold: _liquidationThreshold,
            isSupported: _isSupported
        });
    }

    function getConfig(address _token) external view returns (Config memory) {
        return tokenConfig[_token];
    }
}