// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ProtocolConfig.sol";
import "./Oracle.sol";
import "./InterestRateStrategy.sol";
import "./AToken.sol";
import "./DebtToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";


contract LendingPool is ReentrancyGuard {
    event Deposit(address user, address token, uint256 amount);
    event Withdraw(address user, address token, uint256 amount);
    event Borrow(address user, address token, uint256 amount);
    event Repay(address user, address token, uint256 amount);
    event Liquidate(address user, address token, uint256 amount);

    mapping(address => uint256) public totalBorrows;

    mapping(address => uint256) public liquidityIndex;
    // token => current index (starts at 1e18)

    mapping(address => uint256) public lastUpdateTimestamp;
    // token => last time index was updated

    mapping(address => mapping(address => uint256)) public userDepositIndex;
    // token => user => index at time of deposit

    ProtocolConfig public config;
    Oracle public oracle;
    InterestRateStrategy public interestStrategy;

    address public owner;

    mapping(address => mapping(address => uint256)) public deposits;
    mapping(address => address) public aTokens;
    // token => user => amount

    mapping(address => address) public debtTokens;
    // token => debtToken contract address

    mapping(address => mapping(address => uint256)) public borrows;
    // token => user => amount borrowed
    address[] public supportedTokens;

    constructor(
        address _config,
        address _oracle,
        address _interestStrategy
    ) {
        config = ProtocolConfig(_config);
        oracle = Oracle(_oracle);
        interestStrategy = InterestRateStrategy(_interestStrategy);
        owner = msg.sender;
    }

    function updateLiquidityIndex(address token) internal {
        uint256 timeElapsed = block.timestamp - lastUpdateTimestamp[token];
        if (timeElapsed > 0) {
            uint256 totalDeposited = IERC20(token).balanceOf(address(this));
            if (totalDeposited == 0) {
                lastUpdateTimestamp[token] = block.timestamp;
                return;
            }
            uint256 currentIndex = liquidityIndex[token];
            uint256 rate = interestStrategy.calculateBorrowRate(totalBorrows[token], totalDeposited);
            liquidityIndex[token] = currentIndex + (currentIndex * rate * timeElapsed) / (10000 * 365 days);
            lastUpdateTimestamp[token] = block.timestamp;
        }
    }

    function deposit(address token, uint256 amount) external nonReentrant {
        updateLiquidityIndex(token);
        require(config.getConfig(token).isSupported, "Asset not supported");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        deposits[token][msg.sender] += amount;
        // Mint aTokens to the user
        AToken aTokenInstance = AToken(aTokens[token]);
        aTokenInstance.mint(msg.sender, amount);
        emit Deposit(msg.sender, token, amount);
    }

    function registerAToken(address token, address aTokenAddress) external {
        require(msg.sender == owner, "Only owner");
        aTokens[token] = aTokenAddress;
        supportedTokens.push(token);
        liquidityIndex[token] = 1e18;
        lastUpdateTimestamp[token] = block.timestamp;
    }


    function withdraw(address token, uint256 amount) external nonReentrant {
        updateLiquidityIndex(token);
        require(deposits[token][msg.sender] >= amount, "Insufficient balance");
        // burn aTokens
        AToken aTokenInstance = AToken(aTokens[token]);
        aTokenInstance.burn(msg.sender, amount);
        // update deposits mapping
        deposits[token][msg.sender] -= amount;

        // transfer tokens back to user
        IERC20(token).transfer(msg.sender, amount);
        emit Withdraw(msg.sender, token, amount);
    }



    function getUserCollateralValue(address user) public view returns (uint256) {
        uint256 totalCollateralValue = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 userDeposit = deposits[token][user];
            if (userDeposit > 0) {
                uint256 price = oracle.getPrice(token);
                totalCollateralValue += userDeposit * price;
            }
        }
        return totalCollateralValue;
    }

    function registerDebtToken(address token, address debtTokenAddress) external {
        require(msg.sender == owner, "Only owner");
        debtTokens[token] = debtTokenAddress;
    }

    function borrow(address _token, uint256 amount) external nonReentrant {
        updateLiquidityIndex(_token);
        // Implement borrowing logic
        require(IERC20(_token).balanceOf(address(this)) >= amount, "Insufficient liquidity");
        require(config.getConfig(_token).isSupported, "Asset not supported");
        require(getUserCollateralValue(msg.sender) >= (amount * config.getConfig(_token).LTV) / 10000, "Insufficient collateral");
        borrows[_token][msg.sender] += amount;
        totalBorrows[_token] += amount;
        IERC20(_token).transfer(msg.sender, amount);
        DebtToken debtTokenInstance = DebtToken(debtTokens[_token]);
        debtTokenInstance.mint(msg.sender, amount);
        emit Borrow(msg.sender, _token, amount);
    }

    function repay(address _token, uint256 amount) external nonReentrant {
        // Implement repayment logic
        require(borrows[_token][msg.sender] >= amount, "Repay amount exceeds borrow");
        IERC20(_token).transferFrom(msg.sender, address(this), amount);
        borrows[_token][msg.sender] -= amount;
        DebtToken debtTokenInstance = DebtToken(debtTokens[_token]);
        debtTokenInstance.burn(msg.sender, amount);
        emit Repay(msg.sender, _token, amount);
    }

    function liquidate(address borrower, address _token, uint256 amount) external nonReentrant {
        // Implement liquidation logic
        require(borrows[_token][borrower] >= amount, "Liquidation amount exceeds borrow");
        uint256 collateralValue = getUserCollateralValue(borrower);
        uint256 debtValue = borrows[_token][borrower] * oracle.getPrice(_token);
        require((collateralValue * config.getConfig(_token).liquidationThreshold) / 10000 < debtValue, "Position not undercollateralized");

        IERC20(_token).transferFrom(msg.sender, address(this), amount);

        // Transfer collateral to liquidator
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 userDeposit = deposits[token][borrower];
            if (userDeposit > 0) {
                uint256 price = oracle.getPrice(token);
                uint256 collateralToSeize = (amount * price) / oracle.getPrice(_token);
                uint256 bonus = (collateralToSeize * config.getConfig(token).liquidationBonus) / 10000;
                collateralToSeize += bonus;
                if (collateralToSeize > userDeposit) {
                    collateralToSeize = userDeposit;
                }
                deposits[token][borrower] -= collateralToSeize;
                IERC20(token).transfer(msg.sender, collateralToSeize);
            }
        }

        // Update borrower's debt
        borrows[_token][borrower] -= amount;
        DebtToken debtTokenInstance = DebtToken(debtTokens[_token]);
        debtTokenInstance.burn(borrower, amount);
        emit Liquidate(borrower, _token, amount);
    }

    function getUserDebtValue(address user) public view returns (uint256) {
        uint256 totalDebtValue = 0;
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            address token = supportedTokens[i];
            uint256 userBorrow = borrows[token][user];
            if (userBorrow > 0) {
                uint256 price = oracle.getPrice(token);
                totalDebtValue += userBorrow * price;
            }
        }
        return totalDebtValue;
    }

    function getHealthFactor(address user) external view returns (uint256) {
        uint256 collateralValue = getUserCollateralValue(user);
        uint256 debtValue = getUserDebtValue(user);
        if (debtValue == 0) {
            return type(uint256).max;
        }
        return (collateralValue * 10000) / debtValue;
    }

    
}