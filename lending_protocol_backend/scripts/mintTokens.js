// scripts/mintTokens.js
import pkg from "hardhat";
const { ethers } = pkg;

async function main() {
    const wbtc = await ethers.getContractAt("MockERC20", "0x523c57F4C108417CA8CbF91AdFC1C9C5f4940b82");
    const matic = await ethers.getContractAt("MockERC20", "0xE90508306900f416FF177431B5932Dfc28D97Ed3");

    await wbtc.mint("0x172c4f0e07a699BBDc91f1FEB6C3a48B2a5deccB", ethers.parseUnits("10", 8));
    console.log("Minted 10 WBTC")

    await matic.mint("0x172c4f0e07a699BBDc91f1FEB6C3a48B2a5deccB", ethers.parseUnits("10000", 18));
    console.log("Minted 10000 MATIC")
}

main().catch(console.error);