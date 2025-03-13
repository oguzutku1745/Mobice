const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const TOKEN_ADDRESS = "0x2b961E3959b79326A8e7F64Ef0d2d825707669b5"; // Updated token address
  
  console.log("Checking migration status...");
  
  // Get signers
  const [owner, user1] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("User address:", user1.address);
  
  // Get contract instance
  const BondingCurve = await ethers.getContractFactory("BondingCurve");
  const token = await BondingCurve.attach(TOKEN_ADDRESS);
  
  console.log("Token address:", TOKEN_ADDRESS);
  
  // Get token metadata
  console.log("\nGetting token metadata...");
  const name = await token.name();
  const symbol = await token.symbol();
  
  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
  
  // Check if migrated
  const migrated = await token.migrated();
  console.log("Token migrated status:", migrated);
  
  if (migrated) {
    console.log("\nToken has been migrated to Uniswap!");
    
    try {
      // Get pair address
      const pairAddress = await token.pairAddress();
      console.log("Uniswap pair address:", pairAddress);
    } catch (error) {
      console.log("Error getting pair address:", error.message.split('\n')[0]);
    }
    
    // Get user token balance
    const userBalance = await token.balanceOf(user1.address);
    console.log("User token balance:", ethers.formatUnits(userBalance, 18));
    
    // Get owner token balance
    const ownerBalance = await token.balanceOf(owner.address);
    console.log("Owner token balance:", ethers.formatUnits(ownerBalance, 18));
    
    try {
      // Get contract token balance
      const contractBalance = await token.balanceOf(TOKEN_ADDRESS);
      console.log("Contract token balance:", ethers.formatUnits(contractBalance, 18));
    } catch (error) {
      console.log("Error getting contract token balance:", error.message.split('\n')[0]);
    }
    
    // Get contract ETH balance
    const contractETHBalance = await ethers.provider.getBalance(TOKEN_ADDRESS);
    console.log("Contract ETH balance:", ethers.formatEther(contractETHBalance));
    
    // Get virtual tokens
    const virtualTokens = await token.virtualTokens();
    console.log("Virtual tokens:", ethers.formatUnits(virtualTokens, 18));
    
    // Get collected ETH
    const collectedETH = await token.collectedETH();
    console.log("Collected ETH:", ethers.formatEther(collectedETH));
    
    // Try to buy tokens (should fail)
    console.log("\nAttempting to buy tokens after migration (should fail)...");
    try {
      const buyTx = await token.connect(user1).buy(ethers.parseUnits("1000", 18), {
        value: ethers.parseEther("0.1"),
        gasLimit: 1000000
      });
      
      const receipt = await buyTx.wait();
      console.log("Transaction hash:", receipt.hash);
      console.log("WARNING: Buy transaction succeeded, but it should have failed!");
    } catch (error) {
      console.log("Buy transaction failed as expected:", error.message.split('\n')[0]);
    }
    
    // Try to sell tokens (should fail)
    console.log("\nAttempting to sell tokens after migration (should fail)...");
    try {
      if (userBalance > 0) {
        const sellTx = await token.connect(user1).sell(userBalance / 2n, {
          gasLimit: 1000000
        });
        
        const receipt = await sellTx.wait();
        console.log("Transaction hash:", receipt.hash);
        console.log("WARNING: Sell transaction succeeded, but it should have failed!");
      } else {
        console.log("User has no tokens to sell.");
      }
    } catch (error) {
      console.log("Sell transaction failed as expected:", error.message.split('\n')[0]);
    }
  } else {
    console.log("\nToken has not been migrated to Uniswap yet.");
    
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
    
    if (virtualTokens <= migrationTrigger) {
      console.log("\nMigration threshold has been reached!");
      console.log("You can run the migrate-token.js script to perform the migration.");
    } else {
      const tokensNeeded = virtualTokens - migrationTrigger;
      console.log("\nTokens needed to reach migration threshold:", ethers.formatUnits(tokensNeeded, 18));
      console.log("You can run the buy-to-migrate.js script to buy enough tokens to reach the threshold.");
    }
  }
  
  console.log("\nMigration check completed!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 