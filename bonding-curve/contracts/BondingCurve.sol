// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "./BondingCurveFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256) external;
}

interface IMockUniswapRouter {
    function getFactory() external view returns (address);
    function getWETH() external view returns (address);
}

contract BondingCurve is ERC20, Ownable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1B tokens
    uint256 public constant INITIAL_VIRTUAL_TOKENS = 1_073_000_000 * 10**18;
    uint256 public constant INITIAL_VIRTUAL_ETH = 40.25 * 10**18;
    uint256 public constant INITIAL_PRICE = 0.0000000025 * 10**18; // 0.0000000025 ETH per token
    uint256 public constant TARGET_PRICE = 0.0000000375 * 10**18; // 0.0000000375 ETH per token
    uint256 public constant MIGRATION_THRESHOLD = 80; // 80% tokens sold triggers migration
    uint256 public constant MIGRATION_FEE_PERCENTAGE = 35; // 3.5% (scaled by 10)
    uint256 public collectedETH;
    uint256 public virtualTokens;
    uint256 public virtualETH;
    uint256 public k;
    address public immutable thirdTradeDex;
    address public uniswapRouter;
    address public pairAddress;
    bool public migrated;
    address[] public allPairs; 

    // Metadata fields
    string public description;
    string public imageUrl;
    uint256 public creationTime;
    
    mapping(address => bool) public migratedPairs;
    mapping(address => address) public tokenPairs; 
    mapping(address => Trade[]) public userTrades; 

    struct Trade {
        uint256 amount;
        uint256 price;
        bool isBuy; 
    }

    event Buy(address indexed buyer, uint256 tokens, uint256 cost);
    event Sell(address indexed seller, uint256 tokens, uint256 payout);
    event Migrate(uint256 tokensMigrated, uint256 ethMigrated, uint256 liquidityAmount);
    event DebugValues(uint256 liquidity, uint256 virtualTokens, address router, address factory, address pair);
    event MetadataUpdated(string description, string imageUrl);

    address public factory;

    constructor(
        string memory name,
        string memory symbol,
        string memory _description,
        string memory _imageUrl,
        address _thirdTradeDex,
        address _uniswapRouter,
        address _owner,
        address _factory
    ) ERC20(name, symbol) Ownable(_owner) {
        _mint(_owner, INITIAL_VIRTUAL_TOKENS);
        thirdTradeDex = _thirdTradeDex;
        uniswapRouter = _uniswapRouter;
        factory = _factory;
        virtualTokens = INITIAL_VIRTUAL_TOKENS;
        virtualETH = INITIAL_VIRTUAL_ETH;
        k = virtualTokens * virtualETH;
        
        // Set metadata
        description = _description;
        imageUrl = _imageUrl;
        creationTime = block.timestamp;
        
        emit MetadataUpdated(_description, _imageUrl);
    }

    // Function to update metadata (only owner)
    function updateMetadata(string memory _description, string memory _imageUrl) external onlyOwner {
        description = _description;
        imageUrl = _imageUrl;
        
        emit MetadataUpdated(_description, _imageUrl);
    }
    
    // Function to get all token metadata in one call
    function getTokenMetadata() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenDescription,
        string memory tokenImageUrl,
        uint256 tokenCreationTime,
        uint256 marketCap,
        bool isMigrated
    ) {
        uint256 currentPrice = virtualETH / virtualTokens;
        uint256 currentMarketCap = currentPrice * (INITIAL_VIRTUAL_TOKENS - virtualTokens);
        
        return (
            name(),  // ERC20 name function
            symbol(), // ERC20 symbol function
            description,
            imageUrl,
            creationTime,
            currentMarketCap,
            migrated
        );
    }

    function getUserData(address user) external view returns (Trade[] memory) {
        return userTrades[user];
    }

    function getAllPairs() external view returns (address[] memory) {
        return allPairs;
    }

    function getPrice(uint256 tokenAmount) public view returns (uint256) {
        require(tokenAmount < virtualTokens, "Not enough virtual tokens left");
        
        uint256 newVirtualTokens = virtualTokens - tokenAmount;
        uint256 newVirtualETH = k / newVirtualTokens;
        return newVirtualETH - virtualETH; // Returns ETH required for `tokenAmount`
    }

    function getMigratedPairs() external view returns (address[] memory) {
        address[] memory pairs = new address[](allPairs.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allPairs.length; i++) {
            if (migratedPairs[allPairs[i]]) {
                pairs[count] = allPairs[i];
                count++;
            }
        }
        
        return pairs;
    }

    // Calculate current market cap
    function getMarketCap() public view returns (uint256) {
        uint256 currentPrice = virtualETH / virtualTokens;
        return currentPrice * (INITIAL_VIRTUAL_TOKENS - virtualTokens);
    }

    function buy(uint256 tokenAmount) external payable {
        require(!migrated, "Bonding curve ended");
        require(tokenAmount > 0, "Invalid amount");

        uint256 cost = getPrice(tokenAmount);
        require(msg.value >= cost, "Insufficient ETH sent");

        collectedETH += cost;
        virtualTokens -= tokenAmount;
        virtualETH += cost;
        k = virtualTokens * virtualETH;

        _transfer(owner(), msg.sender, tokenAmount);

        // Inform Factory about the trade
        BondingCurveFactory(factory).recordTrade(msg.sender, address(this), tokenAmount, cost, true);

        emit Buy(msg.sender, tokenAmount, cost);
    }

    function sell(uint256 tokenAmount) external {
        require(tokenAmount > 0, "Invalid amount");

        uint256 payout = getPrice(tokenAmount);
        require(address(this).balance >= payout, "Not enough liquidity");

        virtualTokens += tokenAmount;
        virtualETH -= payout;
        k = virtualTokens * virtualETH;

        _transfer(msg.sender, owner(), tokenAmount);
        payable(msg.sender).transfer(payout);

        // Inform Factory about the trade
        BondingCurveFactory(factory).recordTrade(msg.sender, address(this), tokenAmount, payout, false);

        emit Sell(msg.sender, tokenAmount, payout);
    }

    function migrate() external onlyOwner {
        require(!migrated, "Already migrated");

        uint256 migrationTrigger = (INITIAL_VIRTUAL_TOKENS * MIGRATION_THRESHOLD) / 100;
        require(virtualTokens <= migrationTrigger, "Not reached threshold");

        // Calculate fee as percentage
        uint256 feeAmount = (collectedETH * MIGRATION_FEE_PERCENTAGE) / 1000;
        uint256 liquidity = collectedETH - feeAmount;
        require(address(this).balance >= liquidity, "Contract ETH balance too low");

        migrated = true;

        // Use the getFactory function for our mock
        address factoryAddress;
        try IMockUniswapRouter(uniswapRouter).getFactory() returns (address factory_) {
            factoryAddress = factory_;
        } catch {
            factoryAddress = IUniswapV2Router02(uniswapRouter).factory();
        }
        require(factoryAddress != address(0), "Uniswap factory not found");

        // Use the getWETH function for our mock
        address weth;
        try IMockUniswapRouter(uniswapRouter).getWETH() returns (address weth_) {
            weth = weth_;
        } catch {
            weth = IUniswapV2Router02(uniswapRouter).WETH();
        }
        require(weth != address(0), "WETH address not found");

        // Wrap ETH into WETH
        IWETH(weth).deposit{value: liquidity}(); // Convert ETH into WETH
        
        // Create the pair first
        IUniswapV2Factory factoryContract = IUniswapV2Factory(factoryAddress);
        pairAddress = factoryContract.createPair(address(this), weth);
        require(pairAddress != address(0), "Failed to create Uniswap pair");

        // Mint the remaining tokens to this contract for liquidity
        _mint(address(this), virtualTokens);
        
        // Approve tokens for liquidity
        _approve(address(this), uniswapRouter, virtualTokens);
        IWETH(weth).approve(uniswapRouter, liquidity);

        // Add liquidity using WETH
        (uint256 tokenAmount, uint256 ethAmount, uint256 liquidityAmount) = IUniswapV2Router02(uniswapRouter).addLiquidity(
            address(this),
            weth,
            virtualTokens,
            liquidity,
            0, // Min tokens
            0, // Min WETH
            owner(),
            block.timestamp + 300
        );
        
        // Record the migration in the factory
        BondingCurveFactory(factory).recordMigration(address(this), pairAddress);

        emit Migrate(tokenAmount, ethAmount, liquidityAmount);
    }

    receive() external payable {} // Accept ETH payments
}
