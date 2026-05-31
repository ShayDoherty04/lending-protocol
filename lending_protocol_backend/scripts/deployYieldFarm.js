import pkg from "hardhat";
const { ethers } = pkg;

const main = async () => {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // Deploy reward token first
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const rewardToken = await MockERC20.deploy("Yield Reward Token", "YRT", 18);
    await rewardToken.waitForDeployment();
    console.log("Reward Token deployed to:", await rewardToken.getAddress());

    // Deploy YieldFarm (stakingToken = aUSDC, rewardToken, rewardRate)
    const YieldFarm = await ethers.getContractFactory("YieldFarm");
    const yieldFarm = await YieldFarm.deploy(
        "0x9c51F1bd0947D9Fe40aCaEa72a44b582D1259Bd0", // aUSDC
        await rewardToken.getAddress(),
        100n // reward rate - 100 tokens per second
    );
    await yieldFarm.waitForDeployment();
    console.log("YieldFarm deployed to:", await yieldFarm.getAddress());

    // Mint reward tokens to YieldFarm so it has tokens to distribute
    await rewardToken.mint(await yieldFarm.getAddress(), ethers.parseUnits("1000000", 18));
    console.log("Minted 1000000 YRT to YieldFarm");
}

main().catch(console.error);