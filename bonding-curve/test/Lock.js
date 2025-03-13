const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseUnits, parseEther } = ethers; // ✅ Corrected import


describe("BondingCurve & Factory Tests", function () {
    let factory, bondingCurve, owner, user1, user2, uniswapRouter, thirdTradeDex, weth;

    beforeEach(async function () {
      [owner, user1, user2, thirdTradeDex] = await ethers.getSigners();
  
      // ✅ Deploy Mock WETH
      const WETH = await ethers.getContractFactory("WETH");
      weth = await WETH.deploy();
      await weth.waitForDeployment();
      console.log("Mock WETH deployed at:", weth.target);
      
      // Deploy Mock Uniswap Router with fully qualified name
      const MockUniswapRouter = await ethers.getContractFactory("contracts/mocks/WETH.sol:MockUniswapRouter");
      uniswapRouter = await MockUniswapRouter.deploy(weth.target);
      await uniswapRouter.waitForDeployment();
      console.log("Mock Uniswap Router deployed at:", uniswapRouter.target);
  
      // ✅ Deploy Factory Contract
      const BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
      factory = await BondingCurveFactory.deploy();
      await factory.waitForDeployment();
      console.log("Factory deployed at:", factory.target);
  
      // ✅ Deploy a BondingCurve via the Factory with metadata
      const tx = await factory.createBondingCurve(
        "Test Token",
        "TEST",
        "This is a test token for the bonding curve",
        "https://example.com/token-image.png",
        thirdTradeDex.address,
        uniswapRouter.target
      );
      const receipt = await tx.wait();
  
      // Get the BondingCurve address from the event
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
      
      const curveAddress = bondingCurveCreatedEvent 
        ? bondingCurveCreatedEvent.args.bondingCurve 
        : null;
  
      if (!curveAddress) throw new Error("Failed to get BondingCurve contract address from logs");
  
      // ✅ Get the BondingCurve contract instance with the correct signer
      bondingCurve = await ethers.getContractAt("BondingCurve", curveAddress, owner);
  
      console.log("BondingCurve deployed at:", bondingCurve.target);
    });
  
    it("Should store and retrieve metadata correctly", async function () {
      // Get token metadata
      const metadata = await bondingCurve.getTokenMetadata();
      
      // Check that the metadata fields match what we expect
      expect(metadata.tokenName).to.equal("Test Token");
      expect(metadata.tokenSymbol).to.equal("TEST");
      expect(metadata.tokenDescription).to.equal("This is a test token for the bonding curve");
      expect(metadata.tokenImageUrl).to.equal("https://example.com/token-image.png");
      expect(metadata.tokenCreationTime).to.be.gt(0);
      expect(metadata.isMigrated).to.be.false;
    });
    
    it("Should allow updating metadata by owner", async function () {
      await bondingCurve.updateMetadata(
        "Updated description",
        "https://example.com/new-image.png"
      );
      
      const metadata = await bondingCurve.getTokenMetadata();
      expect(metadata.tokenDescription).to.equal("Updated description");
      expect(metadata.tokenImageUrl).to.equal("https://example.com/new-image.png");
    });
    
    it("Should return trending tokens from factory", async function () {
      // Create a second token with different metadata
      await factory.createBondingCurve(
        "Second Token",
        "SEC",
        "This is the second test token",
        "https://example.com/second-token.png",
        thirdTradeDex.address,
        uniswapRouter.target
      );
      
      // Get trending tokens
      const trending = await factory.getTrendingTokens();
      expect(trending.length).to.be.gt(0);
      expect(trending[0].name).to.be.oneOf(["Test Token", "Second Token"]);
    });
    
    it("Should return newest tokens from factory", async function () {
      // Get newest tokens
      const newest = await factory.getNewestTokens();
      expect(newest.length).to.be.gt(0);
      expect(newest[0].name).to.equal("Test Token");
    });

    it("Should allow users to buy tokens with ETH", async function () {
        const buyAmount = parseUnits("100", 18); // Buy 100 tokens

        await expect(
            bondingCurve.connect(user1).buy(buyAmount, { value: parseEther("0.0001") })
        ).to.emit(bondingCurve, "Buy");

        const balance = await bondingCurve.balanceOf(user1.address);
        expect(balance).to.equal(buyAmount);
    });

    it("Should allow users to sell tokens for ETH", async function () {
      const buyAmount = parseUnits("100", 18);
  
      await bondingCurve.connect(user1).buy(buyAmount, { value: parseEther("0.0001") });
  
      await bondingCurve.connect(user1).approve(bondingCurve.target, buyAmount); // ✅ Fix: use `target`
  
      await expect(bondingCurve.connect(user1).sell(buyAmount)).to.emit(bondingCurve, "Sell");
  
      const balance = await bondingCurve.balanceOf(user1.address);
      expect(balance).to.equal(0);
    });
  
    it("Should migrate to Uniswap after 80% of tokens are sold", async function () {
      // Get the WETH address from the router using getWETH
      const wethAddress = await uniswapRouter.getWETH();
      console.log("Using Mock WETH Address:", wethAddress);
  
      // Get the price of buying 80% of the total supply
      const tokensToSell = parseUnits("800000000", 18);
      const estimatedCost = await bondingCurve.getPrice(tokensToSell);
  
      console.log("Estimated ETH cost for 80% supply:", ethers.formatEther(estimatedCost));
  
      // ✅ Attempt to buy tokens with the correct amount of ETH
      await bondingCurve.connect(user1).buy(tokensToSell, { value: estimatedCost });
  
      // Fetch important values before calling migrate()
      const virtualTokens = (await bondingCurve.virtualTokens()).toString();
      const collectedETH = (await bondingCurve.collectedETH()).toString();
      const migrationFeePercentage = (await bondingCurve.MIGRATION_FEE_PERCENTAGE()).toString();
      const feeAmount = (BigInt(collectedETH) * BigInt(migrationFeePercentage)) / BigInt(1000);
  
      console.log("virtualTokens:", virtualTokens);
      console.log("collectedETH:", collectedETH);
      console.log("migrationFeePercentage:", migrationFeePercentage);
      console.log("feeAmount:", feeAmount.toString());
  
      // ✅ Ensure migration can now happen
      await expect(bondingCurve.connect(owner).migrate()).to.emit(bondingCurve, "Migrate");
      const migrated = await bondingCurve.migrated();
      expect(migrated).to.be.true;
    });
});
