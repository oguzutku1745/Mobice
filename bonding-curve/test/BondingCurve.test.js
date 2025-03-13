const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BondingCurve", function () {
  let BondingCurveFactory;
  let BondingCurve;
  let factory;
  let token;
  let owner;
  let user1;
  let user2;
  let thirdTradeDex;
  let uniswapRouter;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, thirdTradeDex, uniswapRouter] = await ethers.getSigners();
    
    // Deploy the factory
    BondingCurveFactory = await ethers.getContractFactory("BondingCurveFactory");
    factory = await BondingCurveFactory.deploy();
    
    // Create a token
    const tx = await factory.createBondingCurve(
      "Test Token",
      "TEST",
      "This is a test token",
      "https://example.com/logo.png",
      thirdTradeDex.address,
      uniswapRouter.address
    );
    
    const receipt = await tx.wait();
    
    // Get the token address from the factory
    const allTokens = await factory.allBondingCurves(0);
    
    // Get the token contract
    BondingCurve = await ethers.getContractFactory("BondingCurve");
    token = await BondingCurve.attach(allTokens);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set the correct token name and symbol", async function () {
      expect(await token.name()).to.equal("Test Token");
      expect(await token.symbol()).to.equal("TEST");
    });

    it("Should set the correct metadata", async function () {
      const metadata = await token.getTokenMetadata();
      expect(metadata.tokenName).to.equal("Test Token");
      expect(metadata.tokenSymbol).to.equal("TEST");
      expect(metadata.tokenDescription).to.equal("This is a test token");
      expect(metadata.tokenImageUrl).to.equal("https://example.com/logo.png");
    });
  });

  describe("Transactions", function () {
    it("Should allow users to buy tokens", async function () {
      // User1 buys tokens
      const buyAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH
      await token.connect(user1).buy({ value: buyAmount });
      
      // Check user1's token balance
      const user1Balance = await token.balanceOf(user1.address);
      expect(user1Balance).to.be.gt(0);
    });

    it("Should allow users to sell tokens", async function () {
      // User1 buys tokens
      const buyAmount = ethers.utils.parseEther("0.1"); // 0.1 ETH
      await token.connect(user1).buy({ value: buyAmount });
      
      // Get user1's token balance
      const user1Balance = await token.balanceOf(user1.address);
      
      // User1 sells half of their tokens
      const sellAmount = user1Balance.div(2);
      await token.connect(user1).sell(sellAmount);
      
      // Check user1's updated token balance
      const updatedUser1Balance = await token.balanceOf(user1.address);
      expect(updatedUser1Balance).to.be.lt(user1Balance);
    });

    it("Should follow the bonding curve price formula", async function () {
      // User1 buys tokens
      const buyAmount1 = ethers.utils.parseEther("0.1"); // 0.1 ETH
      await token.connect(user1).buy({ value: buyAmount1 });
      
      // Get user1's token balance
      const user1Balance = await token.balanceOf(user1.address);
      
      // User2 buys tokens with the same amount
      const buyAmount2 = ethers.utils.parseEther("0.1"); // 0.1 ETH
      await token.connect(user2).buy({ value: buyAmount2 });
      
      // Get user2's token balance
      const user2Balance = await token.balanceOf(user2.address);
      
      // User2 should get fewer tokens than user1 because the price increases
      expect(user2Balance).to.be.lt(user1Balance);
    });
  });

  describe("Factory", function () {
    it("Should allow creating multiple tokens", async function () {
      // Create another token
      await factory.connect(user1).createBondingCurve(
        "Second Token",
        "SEC",
        "This is a second test token",
        "https://example.com/logo2.png",
        thirdTradeDex.address,
        uniswapRouter.address
      );
      
      // Get the count of tokens
      const tokenCount = await factory.getBondingCurveCount();
      expect(tokenCount).to.equal(2);
    });

    it("Should track user created tokens", async function () {
      // Create a token as user1
      await factory.connect(user1).createBondingCurve(
        "User1 Token",
        "USR1",
        "This is user1's token",
        "https://example.com/user1logo.png",
        thirdTradeDex.address,
        uniswapRouter.address
      );
      
      // Get user1's created tokens
      const user1Tokens = await factory.getUserCreatedCurves(user1.address);
      expect(user1Tokens.length).to.equal(1);
    });
  });
}); 