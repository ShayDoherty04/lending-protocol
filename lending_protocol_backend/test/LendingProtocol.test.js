import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("LendingProtocol", function () {
    let LendingProtocol, lendingProtocol, owner, borrower, liquidator;

    beforeEach(async function () {
        [owner, borrower, liquidator] = await ethers.getSigners();

        // Deploy mock tokens
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        this.tokenA = await MockERC20.deploy("TokenA", "TKA", 6);
        this.tokenB = await MockERC20.deploy("TokenB", "TKB", 6);

        // Deploy oracle
        const Oracle = await ethers.getContractFactory("Oracle");
        this.oracle = await Oracle.deploy();

        // Deploy ProtocolConfig
        const ProtocolConfig = await ethers.getContractFactory("ProtocolConfig");
        this.protocolConfig = await ProtocolConfig.deploy();

        // Deploy InterestRateStrategy
        const InterestRateStrategy = await ethers.getContractFactory("InterestRateStrategy");
        this.interestStrategy = await InterestRateStrategy.deploy(200, 800, 5000, 8000);

        // Deploy LendingPool
        const LendingPool = await ethers.getContractFactory("LendingPool");
        this.lendingPool = await LendingPool.deploy(
            this.protocolConfig.target,
            this.oracle.target,
            this.interestStrategy.target
        );

        // Deploy AToken and DebtToken (need lendingPool address first)
        const AToken = await ethers.getContractFactory("AToken");
        this.aTokenA = await AToken.deploy("AToken A", "aTKA", this.tokenA.target, this.lendingPool.target);

        const DebtToken = await ethers.getContractFactory("DebtToken");
        this.debtTokenA = await DebtToken.deploy("DebtToken A", "dTKA", this.tokenA.target, this.lendingPool.target);

        // Configure ProtocolConfig
        await this.protocolConfig.setConfig(this.tokenA.target, 8000, 500, 8500, true);

        // Set oracle prices
        await this.oracle.setPrice(this.tokenA.target, 1000);
        await this.oracle.setPrice(this.tokenB.target, 2000);

        // Register aToken and debtToken in LendingPool
        await this.lendingPool.registerAToken(this.tokenA.target, this.aTokenA.target);
        await this.lendingPool.registerDebtToken(this.tokenA.target, this.debtTokenA.target);

        // Mint tokens to borrower so they have something to deposit
        await this.tokenA.mint(borrower.address, 10000);
    });

    it("should allow deposits and mint aTokens", async function () {
        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(borrower).deposit(this.tokenA.target, 1000);

        const aTokenBalance = await this.aTokenA.balanceOf(borrower.address);
        expect(aTokenBalance).to.equal(1000);

        const lendingPoolBalance = await this.tokenA.balanceOf(this.lendingPool.target);
        expect(lendingPoolBalance).to.equal(1000);
    });

    it.skip("should accrue interest over time", async function () {
        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(borrower).deposit(this.tokenA.target, 1000);

        // Simulate time passing
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine");

        const aTokenBalance = await this.aTokenA.balanceOf(borrower.address);
        expect(aTokenBalance).to.be.gt(1000); // Should have accrued interest
    });

    it("should allow borrowing against collateral", async function () {
        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(borrower).deposit(this.tokenA.target, 1000);
        await this.lendingPool.connect(borrower).borrow(this.tokenA.target, 500);

        const debtTokenBalance = await this.debtTokenA.balanceOf(borrower.address);
        expect(debtTokenBalance).to.equal(500);
    });

    it("should allow repayments and update debt", async function () {
        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(borrower).deposit(this.tokenA.target, 1000);
        await this.lendingPool.connect(borrower).borrow(this.tokenA.target, 500);

        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 500);
        await this.lendingPool.connect(borrower).repay(this.tokenA.target, 500);
        const debtTokenBalance = await this.debtTokenA.balanceOf(borrower.address);
        expect(debtTokenBalance).to.equal(0);
    });

    it("should allow withdrawals and burn aTokens", async function () {
        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(borrower).deposit(this.tokenA.target, 1000);
        await this.lendingPool.connect(borrower).withdraw(this.tokenA.target, 1000);
        const aTokenBalance = await this.aTokenA.balanceOf(borrower.address);
        expect(aTokenBalance).to.equal(0);
    });

   it("should liquidate undercollateralized positions", async function () {
        await this.tokenA.connect(borrower).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(borrower).deposit(this.tokenA.target, 1000);
        await this.lendingPool.connect(borrower).borrow(this.tokenA.target, 900);

        // Crash the price
        await this.oracle.setPrice(this.tokenA.target, 500);

        // Mint tokens to liquidator and liquidate
        await this.tokenA.mint(liquidator.address, 1000);
        await this.tokenA.connect(liquidator).approve(this.lendingPool.target, 1000);
        await this.lendingPool.connect(liquidator).liquidate(borrower.address, this.tokenA.target, 500);

        const debtBalance = await this.debtTokenA.balanceOf(borrower.address);
        expect(debtBalance).to.equal(400);
    });
})

