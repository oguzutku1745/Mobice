const { ethers } = require("hardhat");

async function main() {
  // Replace with your deployed contract addresses
  const FACTORY_ADDRESS = "0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0"; // Replace with your factory address
  const TOKEN_ADDRESS = "0x9bd03768a7DCc129555dE410FF8E85528A4F88b5"; // Replace with your token address
  
  console.log("Interacting with contracts...");
  
  // Get signers
  const [owner, user1, user2] = await ethers.getSigners();
  console.log("Owner address:", owner.address);
  console.log("User1 address:", user1.address);
  console.log("User2 address:", user2.address);
  
  // Get contract instances
  const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
  const BondingCurve = await ethers.getContractFactory("BondingCurve");
  
  const factory = await BondingCurveFactory.attach(FACTORY_ADDRESS);
  const token = await BondingCurve.attach(TOKEN_ADDRESS);
  
  console.log("Factory address:", factory.address);
  console.log("Token address:", token.address);
  
  // Get token metadata
  console.log("\nGetting token metadata...");
  const name = await token.name();
  const symbol = await token.symbol();
  const metadata = await token.getTokenMetadata();
  
  console.log("Token name:", name);
  console.log("Token symbol:", symbol);
  console.log("Token metadata:", {
    name: metadata.tokenName,
    symbol: metadata.tokenSymbol,
    description: metadata.tokenDescription,
    imageUrl: metadata.tokenImageUrl
  });
  
  // Buy tokens
  console.log("\nBuying tokens...");
  
  console.log(`Buying tokens with 0.1 ETH...`);
  // Use a direct approach
  const buyTx = await token.connect(user1).buy({
    value: 100000000000000000n // 0.1 ETH as a BigInt
  });
  const buyReceipt = await buyTx.wait();
  
  console.log("Buy transaction hash:", buyReceipt.transactionHash);
  
  // Get user1's token balance
  const user1Balance = await token.balanceOf(user1.address);
  console.log(`User1 token balance: ${user1Balance.toString()}`);
  
  // Sell tokens
  console.log("\nSelling tokens...");
  const sellAmount = user1Balance / 2n; // Sell half of the tokens
  
  console.log(`Selling ${sellAmount.toString()} tokens...`);
  const sellTx = await token.connect(user1).sell(sellAmount);
  const sellReceipt = await sellTx.wait();
  
  console.log("Sell transaction hash:", sellReceipt.transactionHash);
  
  // Get updated user1's token balance
  const updatedUser1Balance = await token.balanceOf(user1.address);
  console.log(`User1 updated token balance: ${updatedUser1Balance.toString()}`);
  
  // Create another token
  console.log("\nCreating another token...");
  const thirdTradeDex = "0x0000000000000000000000000000000000000000";
  const uniswapRouter = "0x0000000000000000000000000000000000000000";
  
  const createTx = await factory.connect(user2).createBondingCurve(
    "Second Token",
    "SEC",
    "This is a second test token",
    "https://example.com/logo2.png",
    thirdTradeDex,
    uniswapRouter
  );
  
  const createReceipt = await createTx.wait();
  console.log("Create transaction hash:", createReceipt.transactionHash);
  
  // Get all tokens
  const allTokens = await factory.getAllBondingCurves();
  console.log("All tokens:", allTokens);
  
  console.log("\nInteraction completed!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 