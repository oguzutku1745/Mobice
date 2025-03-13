// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
const hre = require("hardhat");

async function main() {
  console.log("Deploying contracts...");

  // Get the contract factories
  const BondingCurveFactory = await hre.ethers.getContractFactory("BondingCurveFactory");
  
  // For testing purposes, we'll use the zero address for the third trade DEX and Uniswap router
  const thirdTradeDex = "0x0000000000000000000000000000000000000000";
  const uniswapRouter = "0x0000000000000000000000000000000000000000";
  
  // Deploy the factory
  console.log("Deploying BondingCurveFactory...");
  const factory = await BondingCurveFactory.deploy();
  // Wait for the transaction to be mined
  const deployTx = await factory.getDeployTransaction();
  console.log(`Factory deployment transaction: ${deployTx.hash}`);
  
  console.log(`BondingCurveFactory deployed to: ${factory.address}`);
  
  // Create a test token using the factory
  console.log("Creating a test token...");
  
  const [deployer] = await hre.ethers.getSigners();
  
  const tx = await factory.createBondingCurve(
    "Test Token",
    "TEST",
    "This is a test token for the bonding curve",
    "https://example.com/logo.png",
    thirdTradeDex,
    uniswapRouter
  );
  
  const receipt = await tx.wait();
  
  // Find the token address from the event logs
  // This depends on your contract's event structure
  // For now, we'll just log the transaction receipt
  console.log("Transaction receipt:", receipt.transactionHash);
  
  // Get the token address
  const tokenAddress = await factory.allBondingCurves(0);
  console.log("Token address:", tokenAddress);
  
  // Get the BondingCurve contract
  const BondingCurve = await hre.ethers.getContractFactory("BondingCurve");
  const token = BondingCurve.attach(tokenAddress);
  
  // Get token metadata
  const metadata = await token.getTokenMetadata();
  console.log("Token metadata:", {
    name: metadata.tokenName,
    symbol: metadata.tokenSymbol,
    description: metadata.tokenDescription,
    imageUrl: metadata.tokenImageUrl
  });
  
  console.log("Deployment and test token creation completed!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 