import pkg from "hardhat";
const { ethers } = pkg;


const main = async () => {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with:", deployer.address);

    // Get existing contracts
    const lendingPool = await ethers.getContractAt("LendingPool", "0x1061C7B22A68a969DC4b189Da5c1884AB1226274");
    const protocolConfig = await ethers.getContractAt("ProtocolConfig", "0x7025fb06241E24B7Cdc973EC88FEC17D6A762AAE");
    const oracle = await ethers.getContractAt("Oracle", "0x4065fc6baE83c3D874d6E9Dd540b709962eAA640");

    // Deploy WBTC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const wbtc = await MockERC20.deploy("Wrapped Bitcoin", "WBTC", 8);
    await wbtc.waitForDeployment();
    console.log("WBTC deployed to:", await wbtc.getAddress());


    // deploy matic
    const matic = await MockERC20.deploy("Polygon Matic", "MATIC", 18);
    await matic.waitForDeployment();
    console.log("MATIC deployed to:", await matic.getAddress());


    // Get existing USDC and WETH contracts
    const usdc = await ethers.getContractAt("MockERC20", "0x68B7cF84cE81548BfE33E038F7f414862758a86b");
    const weth = await ethers.getContractAt("MockERC20", "0x4839206125e03F164363E23555b36208D8817fA9");



    //deploy aToken for WBTC
    const WBTCAToken = await ethers.getContractFactory("AToken");
    const aWbtc = await WBTCAToken.deploy("Aave WBTC", "aWBTC", await wbtc.getAddress(), await lendingPool.getAddress());
    await aWbtc.waitForDeployment();
    console.log("aWBTC deployed to:", await aWbtc.getAddress());

    //deploy aToken for MATIC
    const MATICAToken = await ethers.getContractFactory("AToken");
    const aMatic = await MATICAToken.deploy("Aave MATIC", "aMATIC", await matic.getAddress(), await lendingPool.getAddress());
    await aMatic.waitForDeployment();
    console.log("aMATIC deployed to:", await aMatic.getAddress());

    //deploy aToken for WETH
    const WETHAToken = await ethers.getContractFactory("AToken");
    const aWeth = await WETHAToken.deploy("Aave WETH", "aWETH", await weth.getAddress(), await lendingPool.getAddress());
    await aWeth.waitForDeployment();
    console.log("aWETH deployed to:", await aWeth.getAddress());
    

    //deploy dToken for WBTC
    const WBTCDebtToken = await ethers.getContractFactory("DebtToken");
    const dWBTC = await WBTCDebtToken.deploy("Debt WBTC", "dWBTC", await wbtc.getAddress(), await lendingPool.getAddress());
    await dWBTC.waitForDeployment();
    console.log("dWBTC deployed to:", await dWBTC.getAddress());

    //deploy dToken for MATIC
    const MATICDebtToken = await ethers.getContractFactory("DebtToken");
    const dMatic = await MATICDebtToken.deploy("Debt MATIC", "dMATIC", await matic.getAddress(), await lendingPool.getAddress());
    await dMatic.waitForDeployment();
    console.log("dMATIC deployed to:", await dMatic.getAddress());

    //deploy dToken for WETH
    const WETHDebtToken = await ethers.getContractFactory("DebtToken");
    const dWeth = await WETHDebtToken.deploy("Debt WETH", "dWETH", await weth.getAddress(), await lendingPool.getAddress());
    await dWeth.waitForDeployment();
    console.log("dWETH deployed to:", await dWeth.getAddress());


    await protocolConfig.setConfig(await wbtc.getAddress(), 8000, 500, 8500, true);
    await oracle.setPriceFeed(await wbtc.getAddress(), "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43");
    await lendingPool.registerAToken(await wbtc.getAddress(), await aWbtc.getAddress());
    await lendingPool.registerDebtToken(await wbtc.getAddress(), await dWBTC.getAddress());
    console.log("✅ WBTC registered")

    await protocolConfig.setConfig(await matic.getAddress(), 8000, 500, 8500, true);
    await oracle.setPriceFeed(await matic.getAddress(), "0x001382149eBa3441043c1c66972b4772963f5D43");
    await lendingPool.registerAToken(await matic.getAddress(), await aMatic.getAddress());
    await lendingPool.registerDebtToken(await matic.getAddress(), await dMatic.getAddress());
    console.log("✅ MATIC registered");

    await protocolConfig.setConfig(await weth.getAddress(), 8000, 500, 8500, true);
    await oracle.setPriceFeed(await weth.getAddress(), "0x694AA1769357215DE4FAC081bf1f309aDC325306");
    await lendingPool.registerAToken(await weth.getAddress(), await aWeth.getAddress());
    await lendingPool.registerDebtToken(await weth.getAddress(), await dWeth.getAddress());
    console.log("✅ WETH registered");


    console.log("\n--- All addresses ---")
    console.log("WBTC:", await wbtc.getAddress())
    console.log("MATIC:", await matic.getAddress())
    console.log("aWBTC:", await aWbtc.getAddress())
    console.log("aMATIC:", await aMatic.getAddress())
    console.log("aWETH:", await aWeth.getAddress())
    console.log("dWBTC:", await dWBTC.getAddress())
    console.log("dMATIC:", await dMatic.getAddress())
    console.log("dWETH:", await dWeth.getAddress())
}


main().catch(console.error);