const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy Mock WETH first
  console.log("Deploying Mock WETH...");
  const WETH = await ethers.getContractFactory("WETH");
  const weth = await WETH.deploy();
  await weth.waitForDeployment();
  console.log("Mock WETH deployed at:", weth.target);
  
  // Deploy Mock Uniswap Router
  console.log("Deploying Mock Uniswap Router...");
  const MockUniswapRouter = await ethers.getContractFactory("contracts/mocks/WETH.sol:MockUniswapRouter");
  const mockRouter = await MockUniswapRouter.deploy(weth.target);
  await mockRouter.waitForDeployment();
  console.log("Mock Uniswap Router deployed at:", mockRouter.target);

  // Deploy BondingCurveFactory
  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
  const factory = await BondingCurveFactory.deploy();
  await factory.waitForDeployment();
  console.log("BondingCurveFactory deployed to:", factory.target);

  // Create a test token
  console.log("Creating a test token...");
  const thirdTradeDex = "0x0000000000000000000000000000000000000000";
  const uniswapRouter = mockRouter.target; // Use the mock router address

  const tx = await factory.createBondingCurve(
    "Test Token",
    "TEST",
    "This is a test token",
    "https://example.com/logo.png",
    thirdTradeDex,
    uniswapRouter
  );
  await tx.wait();
  console.log("Test token created");

  // Get all bonding curves
  const allTokens = await factory.getAllBondingCurves();
  console.log("Token count:", allTokens.length);

  if (allTokens.length > 0) {
    const tokenAddress = allTokens[0];
    console.log("Token address:", tokenAddress);

    // Get token contract
    const BondingCurve = await ethers.getContractFactory("BondingCurve");
    const token = BondingCurve.attach(tokenAddress);

    // Get token info
    const name = await token.name();
    const symbol = await token.symbol();
    console.log("Token name:", name);
    console.log("Token symbol:", symbol);
    
    // Verify the router address
    const routerAddress = await token.uniswapRouter();
    console.log("Token's Uniswap Router address:", routerAddress);
    
    if (routerAddress === mockRouter.target) {
      console.log("Router address set correctly!");
    } else {
      console.log("Router address not set correctly!");
    }
  }

  console.log("Deployment completed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 