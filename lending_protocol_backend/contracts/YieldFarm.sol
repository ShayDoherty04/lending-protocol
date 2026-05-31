// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract YieldFarm is ReentrancyGuard {

    IERC20 public stakingToken;    // the aToken
    IERC20 public rewardToken;     // reward token
    uint256 public rewardRate;     // reward tokens per second
    address public owner;

    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public lastClaimTime;



    constructor(
        address _stakingToken,
        address _rewardToken,
        uint256 _rewardRate
    ) {
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
        rewardRate = _rewardRate;
        owner = msg.sender;
    }

    function stake (uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot stake zero tokens");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        stakedBalance[msg.sender] += _amount;
        lastClaimTime[msg.sender] = block.timestamp;
    }


    function calculateReward(address _user) public view returns (uint256) {
        uint256 timeDiff = block.timestamp - lastClaimTime[_user];
        return stakedBalance[_user] * rewardRate * timeDiff;
    }

    function claimReward() external nonReentrant {
        uint256 reward = calculateReward(msg.sender);
        require(reward > 0, "No rewards to claim");
        lastClaimTime[msg.sender] = block.timestamp;
        rewardToken.transfer(msg.sender, reward);
    }

    function unstake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Cannot unstake zero tokens");
        require(stakedBalance[msg.sender] >= _amount, "Not enough staked balance");
        
        // Claim rewards first
        uint256 reward = calculateReward(msg.sender);
        if (reward > 0) {
            lastClaimTime[msg.sender] = block.timestamp;
            rewardToken.transfer(msg.sender, reward);
        }
        
        stakedBalance[msg.sender] -= _amount;
        stakingToken.transfer(msg.sender, _amount);
    }
}