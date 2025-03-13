const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract address
  const TOKEN_ADDRESS = "0x9bd03768a7DCc129555dE410FF8E85528A4F88b5"; // Replace with your token address
  
  console.log("Selling tokens...");
  
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
  
  // Sell tokens
  console.log("\nSelling tokens...");
  
  // Get initial balance
  const initialBalance = await token.balanceOf(user1.address);
  console.log("Initial token balance:", initialBalance.toString());
  
  // Calculate how many tokens to sell (half of the balance)
  const tokenAmount = initialBalance / 2n;
  console.log("Selling token amount:", tokenAmount.toString());
  
  try {
    // Call the sell function with the token amount
    const sellTx = await token.connect(user1).sell(tokenAmount, {
      gasLimit: 1000000
    });
    
    const receipt = await sellTx.wait();
    console.log("Transaction hash:", receipt.hash);
    
    // Get new balance
    const newBalance = await token.balanceOf(user1.address);
    console.log("New token balance:", newBalance.toString());
    
    // Get ETH balance
    const ethBalance = await ethers.provider.getBalance(user1.address);
    console.log("ETH balance:", ethers.formatEther(ethBalance));
  } catch (error) {
    console.error("Error selling tokens:", error.message);
  }
  
  console.log("\nSell operation completed!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 