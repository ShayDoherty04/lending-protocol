// scripts/mint.js
import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    const [deployer] = await ethers.getSigners();
    
    const MockERC20 = await ethers.getContractAt("MockERC20", "0x68B7cF84cE81548BfE33E038F7f414862758a86b");
    
    // Mint 10000 USDC to your MetaMask address
    await MockERC20.mint("0x172c4f0e07a699BBDc91f1FEB6C3a48B2a5deccB", ethers.parseUnits("10000", 6));
    console.log("Minted 10000 USDC");
}

main().catch(console.error);