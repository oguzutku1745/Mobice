// We require the Hardhat Runtime Environment explicitly here
const hre = require("hardhat");

async function main() {
  // Replace with your deployed contract addresses
  const FACTORY_ADDRESS = "YOUR_FACTORY_ADDRESS"; // Replace after deployment
  const TOKEN_ADDRESS = "YOUR_TOKEN_ADDRESS"; // Replace after deployment
  
  console.log("Interacting with contracts...");
  
  // Get the contract factories
  const BondingCurveFactory = await hre.ethers.getContractFactory("BondingCurveFactory");
  const BondingCurve = await hre.ethers.getContractFactory("BondingCurve");
  
  // Get contract instances
  const factory = await BondingCurveFactory.attach(FACTORY_ADDRESS);
  const token = await BondingCurve.attach(TOKEN_ADDRESS);
  
  // Get signers
  const [owner, user1, user2] = await hre.ethers.getSigners();
  
  console.log("Factory address:", factory.address);
  console.log("Token address:", token.address);
  console.log("Owner address:", owner.address);
  console.log("User1 address:", user1.address);
  console.log("User2 address:", user2.address);
  
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
  const buyAmount = hre.ethers.utils.parseEther("0.1"); // 0.1 ETH
  
  console.log(`Buying tokens with ${hre.ethers.utils.formatEther(buyAmount)} ETH...`);
  const buyTx = await token.connect(user1).buy({ value: buyAmount });
  const buyReceipt = await buyTx.wait();
  
  console.log("Buy transaction hash:", buyReceipt.transactionHash);
  
  // Get user1's token balance
  const user1Balance = await token.balanceOf(user1.address);
  console.log(`User1 token balance: ${hre.ethers.utils.formatUnits(user1Balance, 18)}`);
  
  // Sell tokens
  console.log("\nSelling tokens...");
  const sellAmount = user1Balance.div(2); // Sell half of the tokens
  
  console.log(`Selling ${hre.ethers.utils.formatUnits(sellAmount, 18)} tokens...`);
  const sellTx = await token.connect(user1).sell(sellAmount);
  const sellReceipt = await sellTx.wait();
  
  console.log("Sell transaction hash:", sellReceipt.transactionHash);
  
  // Get updated user1's token balance
  const updatedUser1Balance = await token.balanceOf(user1.address);
  console.log(`User1 updated token balance: ${hre.ethers.utils.formatUnits(updatedUser1Balance, 18)}`);
  
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
  
  // Get token count
  console.log("\nGetting token count...");
  const tokenCount = await factory.getBondingCurveCount();
  console.log("Token count:", tokenCount.toString());
  
  // Get the second token address
  const secondTokenAddress = await factory.allBondingCurves(1);
  console.log("Second token address:", secondTokenAddress);
  
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