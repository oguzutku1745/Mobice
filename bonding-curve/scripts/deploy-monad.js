// Script to deploy contracts to Monad Testnet
const { ethers, network, run } = require("hardhat");

// Existing contract addresses on Monad Testnet
const UNISWAP_ROUTER_ADDRESS = "0xfb8e1c3b833f9e67a71c859a132cf783b645e436"; // UniswapV2Router02

async function main() {
  console.log("Deploying contracts to Monad Testnet...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with account: ${deployer.address}`);

  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${ethers.formatEther(balance)} MON`);

  try {
    // Deploy the factory
    console.log("Deploying BondingCurveFactory...");
    const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
    const factory = await BondingCurveFactory.deploy();
    await factory.waitForDeployment();
    console.log(`BondingCurveFactory deployed to: ${factory.target}`);

    // Create a test token
    console.log("Creating a test token...");
    
    // ThirdTradeDex is set to zero address as we're only using Uniswap for migration
    // This parameter is a legacy parameter in the contract design
    const THIRD_TRADE_DEX_ADDRESS = "0x0000000000000000000000000000000000000000";
    
    console.log("Using the following addresses:");
    console.log(`- Uniswap Router: ${UNISWAP_ROUTER_ADDRESS} (for migration to liquidity pool)`);
    console.log(`- ThirdTradeDex: ${THIRD_TRADE_DEX_ADDRESS} (not used, set to zero address)`);

    const tx = await factory.createBondingCurve(
      "Monad Test Token",
      "MTT",
      "This is a test token on Monad Testnet",
      "https://example.com/logo.png",
      THIRD_TRADE_DEX_ADDRESS,
      UNISWAP_ROUTER_ADDRESS
    );
    
    console.log("Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("Test token created successfully");

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
    }

    // Log the addresses for easy reference
    console.log("\nDeployment Summary:");
    console.log("====================");
    console.log(`BondingCurveFactory: ${factory.target}`);
    console.log(`Using existing UniswapV2Router02: ${UNISWAP_ROUTER_ADDRESS}`);
    console.log("\nUpdate these addresses in your frontend config.ts file.");
    console.log(`Run: node scripts/update-frontend-config.js ${factory.target}`);

    // Verify contracts on Monad Explorer (if supported)
    if (network.name === "monadTestnet") {
      console.log("\nWaiting for block confirmations before verification...");
      
      // Wait for a few block confirmations before verification
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      console.log("\nVerifying contracts on Monad Explorer...");
      try {
        await run("verify:verify", {
          address: factory.target,
          constructorArguments: [],
        });
        
        console.log("Contract verified successfully!");
      } catch (error) {
        console.error("Error verifying contract:", error);
        console.log("You can manually verify the contract later with:");
        console.log(`npx hardhat verify --network monadTestnet ${factory.target}`);
      }
    }
  } catch (error) {
    console.error("Deployment failed with error:", error);
    
    // Provide more helpful error messages based on common issues
    if (error.message.includes("maxFeePerGas too low")) {
      console.error("\nGas price error: The gas price is too low for the network.");
      console.error("Try increasing the gasPrice in hardhat.config.js");
    } else if (error.message.includes("insufficient funds")) {
      console.error("\nInsufficient funds: Make sure your account has enough MON tokens.");
      console.error("Get testnet MON from the faucet: https://faucet.monad.xyz/");
    } else if (error.message.includes("nonce")) {
      console.error("\nNonce error: There might be a transaction nonce mismatch.");
      console.error("Try resetting your account in MetaMask or wait for pending transactions to complete.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  }); 