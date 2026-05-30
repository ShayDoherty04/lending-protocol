import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "ETH");

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    console.log("USDC deployed to:", await usdc.getAddress());

    const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
    await weth.waitForDeployment();
    console.log("WETH deployed to:", await weth.getAddress());

    // Deploy Oracle
    const Oracle = await ethers.getContractFactory("Oracle");
    const oracle = await Oracle.deploy();
    await oracle.waitForDeployment();
    console.log("Oracle deployed to:", await oracle.getAddress());

    // Deploy ProtocolConfig
    const ProtocolConfig = await ethers.getContractFactory("ProtocolConfig");
    const protocolConfig = await ProtocolConfig.deploy();
    await protocolConfig.waitForDeployment();
    console.log("ProtocolConfig deployed to:", await protocolConfig.getAddress());

    // Deploy InterestRateStrategy (baseRate, slope1, slope2, optimalUtilisation)
    const InterestRateStrategy = await ethers.getContractFactory("InterestRateStrategy");
    const interestStrategy = await InterestRateStrategy.deploy(200, 800, 5000, 8000);
    await interestStrategy.waitForDeployment();
    console.log("InterestRateStrategy deployed to:", await interestStrategy.getAddress());

    // Deploy LendingPool
    const LendingPool = await ethers.getContractFactory("LendingPool");
    const lendingPool = await LendingPool.deploy(
        await protocolConfig.getAddress(),
        await oracle.getAddress(),
        await interestStrategy.getAddress()
    );
    await lendingPool.waitForDeployment();
    console.log("LendingPool deployed to:", await lendingPool.getAddress());

    // Deploy AToken and DebtToken for USDC
    const AToken = await ethers.getContractFactory("AToken");
    const aUsdc = await AToken.deploy("Aave USDC", "aUSDC", await usdc.getAddress(), await lendingPool.getAddress());
    await aUsdc.waitForDeployment();
    console.log("aUSDC deployed to:", await aUsdc.getAddress());

    const DebtToken = await ethers.getContractFactory("DebtToken");
    const dUsdc = await DebtToken.deploy("Debt USDC", "dUSDC", await usdc.getAddress(), await lendingPool.getAddress());
    await dUsdc.waitForDeployment();
    console.log("dUSDC deployed to:", await dUsdc.getAddress());

    // Configure protocol
    await protocolConfig.setConfig(await usdc.getAddress(), 8000, 500, 8500, true);
    await oracle.setPrice(await usdc.getAddress(), 100000000n); // $1 with 8 decimals
    await lendingPool.registerAToken(await usdc.getAddress(), await aUsdc.getAddress());
    await lendingPool.registerDebtToken(await usdc.getAddress(), await dUsdc.getAddress());

    console.log("Protocol configured successfully");
}

main().catch(console.error);