const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const TOKEN_ADDRESS = "0x2b961E3959b79326A8e7F64Ef0d2d825707669b5"; // Updated token address
  
  console.log("Testing migration functionality...");
  
  // Get signers
  const [owner, user1] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
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
  
  // Check if already migrated
  const migrated = await token.migrated();
  console.log("Token migrated status:", migrated);
  
  if (migrated) {
    console.log("Token has already been migrated to Uniswap.");
    return;
  }
  
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
      
      // Ask if user wants to buy these tokens
      console.log("\nTo trigger migration, you need to buy the tokens above.");
      console.log("You can run the buy-token.js script with the appropriate token amount.");
    } catch (error) {
      console.error("Error calculating price:", error.message);
    }
  } else {
    console.log("\nMigration threshold has been reached!");
    console.log("You can now call the migrate function as the owner.");
    
    // Check if the caller is the owner
    const tokenOwner = await token.owner();
    if (owner.address === tokenOwner) {
      console.log("\nYou are the owner. Attempting to migrate...");
      
      // Get contract details before migration
      try {
        const uniswapRouterAddress = await token.uniswapRouter();
        console.log("Uniswap Router address:", uniswapRouterAddress);
        
        const thirdTradeDexAddress = await token.thirdTradeDex();
        console.log("Third Trade DEX address:", thirdTradeDexAddress);
        
        const collectedETH = await token.collectedETH();
        console.log("Collected ETH:", ethers.formatEther(collectedETH));
        
        const contractBalance = await ethers.provider.getBalance(token.address);
        console.log("Contract ETH balance:", ethers.formatEther(contractBalance));
        
        const migrationFeePercentage = await token.MIGRATION_FEE_PERCENTAGE();
        console.log("Migration fee percentage:", migrationFeePercentage.toString());
        
        // Calculate fee
        const feeAmount = (collectedETH * migrationFeePercentage) / 1000n;
        const liquidity = collectedETH - feeAmount;
        console.log("Fee amount:", ethers.formatEther(feeAmount));
        console.log("Liquidity amount:", ethers.formatEther(liquidity));
        
        // Check if contract has enough balance
        if (contractBalance < liquidity) {
          console.log("WARNING: Contract ETH balance is too low for migration!");
        }
      } catch (error) {
        console.error("Error getting contract details:", error.message);
      }
      
      try {
        // Call the migrate function
        const migrateTx = await token.connect(owner).migrate({
          gasLimit: 5000000
        });
        
        const receipt = await migrateTx.wait();
        console.log("Migration transaction hash:", receipt.hash);
        
        // Check if migration was successful
        const newMigratedStatus = await token.migrated();
        console.log("New migration status:", newMigratedStatus);
        
        if (newMigratedStatus) {
          // Get the pair address
          const pairAddress = await token.pairAddress();
          console.log("Uniswap pair address:", pairAddress);
        }
      } catch (error) {
        console.error("Error during migration:", error.message);
        
        // Try to get more detailed error information
        try {
          // Estimate gas to see the revert reason
          await token.connect(owner).migrate.estimateGas({
            gasLimit: 5000000
          });
        } catch (estimateError) {
          console.error("Detailed error:", estimateError.reason || estimateError.message);
        }
      }
    } else {
      console.log("\nYou are not the owner. Only the owner can call the migrate function.");
      console.log("Owner address:", tokenOwner);
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