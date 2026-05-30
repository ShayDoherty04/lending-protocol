// scripts/check.js
import pkg from "hardhat";
const { ethers } = pkg;

async function main() {

    const LendingPool = await ethers.getContractAt("LendingPool", "0x1061C7B22A68a969DC4b189Da5c1884AB1226274");
    const aToken = await LendingPool.aTokens("0x68B7cF84cE81548BfE33E038F7f414862758a86b");
    console.log("aToken address:", aToken);


    const MockERC20 = await ethers.getContractAt("MockERC20", "0x68B7cF84cE81548BfE33E038F7f414862758a86b");
    const balance = await MockERC20.balanceOf("0x172c4f0e07a699BBDc91f1FEB6C3a48B2a5deccB");
    console.log("USDC balance:", balance.toString());
    
    const ProtocolConfig = await ethers.getContractAt("ProtocolConfig", "0x7025fb06241E24B7Cdc973EC88FEC17D6A762AAE");
    const config = await ProtocolConfig.getConfig("0x68B7cF84cE81548BfE33E038F7f414862758a86b");
    console.log("USDC config:", config);
}

main().catch(console.error);