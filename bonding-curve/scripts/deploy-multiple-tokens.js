const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying multiple tokens...");

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

  // Token data for 5 different tokens
  const tokens = [
    {
      name: "MonadCoin",
      symbol: "MND",
      description: "The native token of the Monad ecosystem with high TPS and low fees.",
      imageUrl: "https://example.com/monadcoin.png"
    },
    {
      name: "DeFiToken",
      symbol: "DFI",
      description: "A decentralized finance token built on Monad blockchain.",
      imageUrl: "https://example.com/defitoken.png"
    },
    {
      name: "GameFi",
      symbol: "GAME",
      description: "Gaming meets DeFi with this innovative token.",
      imageUrl: "https://example.com/gamefi.png"
    },
    {
      name: "NFTMarket",
      symbol: "NFTM",
      description: "The token powering the largest NFT marketplace on Monad.",
      imageUrl: "https://example.com/nftmarket.png"
    },
    {
      name: "ArtistToken",
      symbol: "ART",
      description: "Supporting digital artists through blockchain technology.",
      imageUrl: "https://example.com/artisttoken.png"
    }
  ];

  // Create tokens
  const tokenAddresses = [];
  const thirdTradeDex = "0x0000000000000000000000000000000000000000";
  const uniswapRouter = mockRouter.target;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log(`Creating token ${i+1}/${tokens.length}: ${token.name} (${token.symbol})`);
    
    try {
      const tx = await factory.createBondingCurve(
        token.name,
        token.symbol,
        token.description,
        token.imageUrl,
        thirdTradeDex,
        uniswapRouter
      );
      
      const receipt = await tx.wait();
      
      // Get the token address from the event
      const bondingCurveCreatedEvent = receipt.logs.find(log => {
        try {
          const decoded = factory.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return decoded?.name === "BondingCurveCreated";
        } catch (e) {
          return false;
        }
      });
      
      const tokenAddress = bondingCurveCreatedEvent 
        ? bondingCurveCreatedEvent.args.bondingCurve 
        : null;
      
      if (tokenAddress) {
        tokenAddresses.push({
          name: token.name,
          symbol: token.symbol,
          address: tokenAddress
        });
        
        console.log(`Token created at address: ${tokenAddress}`);
        
        // Buy some tokens to simulate activity
        const BondingCurve = await ethers.getContractFactory("BondingCurve");
        const tokenContract = BondingCurve.attach(tokenAddress);
        
        // Buy different amounts for each token to create variety
        const buyAmount = ethers.parseEther((0.05 * (i + 1)).toString()); // 0.05, 0.1, 0.15, 0.2, 0.25 ETH
        const tokenAmount = ethers.parseUnits((1000 * (i + 1)).toString(), 18); // 1000, 2000, 3000, 4000, 5000 tokens
        
        console.log(`Buying ${ethers.formatEther(buyAmount)} ETH worth of ${token.symbol} tokens...`);
        
        const buyTx = await tokenContract.connect(deployer).buy(tokenAmount, {
          value: buyAmount,
          gasLimit: 1000000
        });
        
        await buyTx.wait();
        console.log(`Successfully bought ${token.symbol} tokens`);
      } else {
        console.error(`Failed to get token address for ${token.name}`);
      }
    } catch (error) {
      console.error(`Error creating token ${token.name}:`, error);
    }
  }

  // Print summary
  console.log("\nDeployment Summary:");
  console.log("===================");
  console.log("Factory Address:", factory.target);
  console.log("Router Address:", mockRouter.target);
  console.log("\nCreated Tokens:");
  
  tokenAddresses.forEach((token, index) => {
    console.log(`${index + 1}. ${token.name} (${token.symbol}): ${token.address}`);
  });

  // Save the addresses to a file for easy reference
  const fs = require("fs");
  const path = require("path");
  
  const deploymentInfo = {
    factoryAddress: factory.target,
    routerAddress: mockRouter.target,
    tokens: tokenAddresses
  };
  
  fs.writeFileSync(
    path.join(__dirname, "../deployment-info.json"),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\nDeployment information saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 