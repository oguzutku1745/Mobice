const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed factory address
  const FACTORY_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"; // Replace with your factory address
  
  console.log("Creating a new token...");
  
  // Get signers
  const [owner, user1, user2] = await ethers.getSigners();
  console.log("Creator address:", user2.address);
  
  // Get factory contract instance
  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
  const factory = await BondingCurveFactory.attach(FACTORY_ADDRESS);
  
  console.log("Factory address:", factory.address);
  
  // Create a new token
  console.log("\nCreating a new token...");
  
  const tokenName = "Second Token";
  const tokenSymbol = "SEC";
  const tokenDescription = "This is a second test token created via script";
  const tokenImageUrl = "https://example.com/logo2.png";
  const thirdTradeDex = "0x0000000000000000000000000000000000000000";
  const uniswapRouter = "0x0000000000000000000000000000000000000000";
  
  try {
    // Call the createBondingCurve function
    const createTx = await factory.connect(user2).createBondingCurve(
      tokenName,
      tokenSymbol,
      tokenDescription,
      tokenImageUrl,
      thirdTradeDex,
      uniswapRouter,
      {
        gasLimit: 5000000
      }
    );
    
    const receipt = await createTx.wait();
    console.log("Transaction hash:", receipt.hash);
    
    // Try to find the token address from the transaction logs
    console.log("Looking for token address in transaction logs...");
    
    // Get the user's created tokens
    try {
      // Try to get all bonding curves first
      const allTokens = await factory.getAllBondingCurves();
      console.log("All tokens:", allTokens);
      
      // Try to get user created tokens
      try {
        const userTokens = await factory.getUserCreatedTokens(user2.address);
        console.log("User created tokens:", userTokens);
        
        if (userTokens && userTokens.length > 0) {
          // Get the BondingCurve contract for the latest token
          const BondingCurve = await ethers.getContractFactory("BondingCurve");
          const token = await BondingCurve.attach(userTokens[userTokens.length - 1]);
          
          // Get token metadata
          const name = await token.name();
          const symbol = await token.symbol();
          
          console.log("New token name:", name);
          console.log("New token symbol:", symbol);
        }
      } catch (error) {
        console.error("Error getting user created tokens:", error.message);
        console.log("Trying alternative method...");
        
        // If the latest token is in allTokens, use that
        if (allTokens && allTokens.length > 0) {
          const latestToken = allTokens[allTokens.length - 1];
          console.log("Latest token address:", latestToken);
          
          const BondingCurve = await ethers.getContractFactory("BondingCurve");
          const token = await BondingCurve.attach(latestToken);
          
          // Get token metadata
          const name = await token.name();
          const symbol = await token.symbol();
          
          console.log("New token name:", name);
          console.log("New token symbol:", symbol);
        }
      }
    } catch (error) {
      console.error("Error getting tokens:", error.message);
    }
  } catch (error) {
    console.error("Error creating token:", error.message);
  }
  
  console.log("\nToken creation completed!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 