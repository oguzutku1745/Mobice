const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const TOKEN_ADDRESS = "0x2b961E3959b79326A8e7F64Ef0d2d825707669b5"; // Updated token address
  
  console.log("Buying tokens to reach migration threshold...");
  
  // Get signers
  const [owner, user1] = await ethers.getSigners();
  console.log("User address:", user1.address);
  
  // Get contract instance
  const BondingCurve = await ethers.getContractFactory("BondingCurve");
  const token = await BondingCurve.attach(TOKEN_ADDRESS);
  
  console.log("Token address:", token.address);
  
  // Get token metadata
  console.log("\nGetting token metadata...");
  const name = await token.name();
  const symbol = await token.symbol();
  
  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
  
  // Get current virtual tokens and migration threshold
  const virtualTokens = await token.virtualTokens();
  const initialVirtualTokens = await token.INITIAL_VIRTUAL_TOKENS();
  const migrationThreshold = await token.MIGRATION_THRESHOLD();
  
  // Calculate migration trigger point (80% of tokens sold)
  const migrationTrigger = (initialVirtualTokens * BigInt(migrationThreshold)) / 100n;
  
  console.log("\nMigration status:");
  console.log("Initial virtual tokens:", ethers.formatUnits(initialVirtualTokens, 18));
  console.log("Current virtual tokens:", ethers.formatUnits(virtualTokens, 18));
  console.log("Migration threshold:", migrationThreshold.toString(), "%");
  console.log("Migration trigger point:", ethers.formatUnits(migrationTrigger, 18));
  
  // Calculate how many more tokens need to be bought to trigger migration
  if (virtualTokens > migrationTrigger) {
    const tokensNeeded = virtualTokens - migrationTrigger;
    console.log("\nTokens needed to reach migration threshold:", ethers.formatUnits(tokensNeeded, 18));
    
    try {
      // Get the price for these tokens
      const price = await token.getPrice(tokensNeeded);
      console.log("ETH needed to buy these tokens:", ethers.formatEther(price));
      
      // Get initial balance
      const initialBalance = await token.balanceOf(user1.address);
      console.log("Initial token balance:", ethers.formatUnits(initialBalance, 18));
      
      // Add a buffer to ensure we have enough ETH
      const buffer = ethers.parseEther("0.5"); // Add 0.5 ETH buffer
      const totalETHNeeded = price + buffer;
      
      console.log("\nAttempting to buy tokens to reach migration threshold...");
      console.log("Sending ETH:", ethers.formatEther(totalETHNeeded));
      
      // Buy tokens
      const buyTx = await token.connect(user1).buy(tokensNeeded, {
        value: totalETHNeeded,
        gasLimit: 5000000
      });
      
      const receipt = await buyTx.wait();
      console.log("Transaction hash:", receipt.hash);
      
      // Get new balance
      const newBalance = await token.balanceOf(user1.address);
      console.log("New token balance:", ethers.formatUnits(newBalance, 18));
      
      // Check if migration threshold is reached
      const newVirtualTokens = await token.virtualTokens();
      console.log("New virtual tokens:", ethers.formatUnits(newVirtualTokens, 18));
      
      if (newVirtualTokens <= migrationTrigger) {
        console.log("\nMigration threshold has been reached!");
        console.log("You can now run the migrate-token.js script to perform the migration.");
      } else {
        console.log("\nMigration threshold has not been reached yet.");
        console.log("Remaining tokens needed:", ethers.formatUnits(newVirtualTokens - migrationTrigger, 18));
      }
    } catch (error) {
      console.error("Error buying tokens:", error.message);
    }
  } else {
    console.log("\nMigration threshold has already been reached!");
    console.log("You can run the migrate-token.js script to perform the migration.");
  }
  
  console.log("\nBuy operation completed!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 