// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./BondingCurve.sol";

// Interface for BondingCurve to avoid casting issues
interface IBondingCurve {
    function getMarketCap() external view returns (uint256);
    function getTokenMetadata() external view returns (
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenDescription,
        string memory tokenImageUrl,
        uint256 tokenCreationTime,
        uint256 marketCap,
        bool isMigrated
    );
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract BondingCurveFactory {
    address[] public allBondingCurves;
    mapping(address => address[]) public userCreatedCurves;
    mapping(address => address) public tokenToPair;
    mapping(address => Trade[]) public userTrades; 
    address[] public migratedPairs;
    
    // Track creation timestamps for sorting
    mapping(address => uint256) public creationTimes;
    
    // Track market caps for trending calculation
    mapping(address => uint256) public lastKnownMarketCaps;
    
    struct Trade {
        address bondingCurve;
        uint256 amount;
        uint256 price;
        bool isBuy; 
    }
    
    // Struct for token metadata to return in batch queries
    struct TokenMetadata {
        address tokenAddress;
        string name;
        string symbol;
        string description;
        string imageUrl;
        uint256 creationTime;
        uint256 marketCap;
        bool migrated;
    }

    event BondingCurveCreated(address indexed creator, address bondingCurve, string name, string symbol);
    event PoolCreated(address indexed bondingCurve, address pairAddress);
    event MarketCapUpdated(address indexed bondingCurve, uint256 marketCap);

    function createBondingCurve(
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageUrl,
        address _thirdTradeDex, 
        address _uniswapRouter
    ) external {
        BondingCurve newCurve = new BondingCurve(
            name,
            symbol,
            description,
            imageUrl,
            _thirdTradeDex,
            _uniswapRouter,
            msg.sender,
            address(this)
        );
        
        address curveAddress = address(newCurve);
        allBondingCurves.push(curveAddress);
        userCreatedCurves[msg.sender].push(curveAddress);
        creationTimes[curveAddress] = block.timestamp;
        
        // Initialize market cap
        updateMarketCap(curveAddress);

        emit BondingCurveCreated(msg.sender, curveAddress, name, symbol);
    }

    function recordTrade(address user, address bondingCurve, uint256 amount, uint256 price, bool isBuy) external {
        // Only allow bonding curve contracts to call this
        require(isBondingCurve(msg.sender), "Caller not authorized");
        
        userTrades[user].push(Trade(bondingCurve, amount, price, isBuy));
        
        // Update market cap after trade
        updateMarketCap(bondingCurve);
    }

    function recordMigration(address bondingCurve, address pairAddress) external {
        // Only allow bonding curve contracts to call this
        require(isBondingCurve(msg.sender), "Caller not authorized");
        
        require(tokenToPair[bondingCurve] == address(0), "Pair already recorded");
        tokenToPair[bondingCurve] = pairAddress;
        migratedPairs.push(pairAddress);

        // Update market cap after migration
        updateMarketCap(bondingCurve);

        emit PoolCreated(bondingCurve, pairAddress);
    }
    
    // Helper function to check if an address is a bonding curve
    function isBondingCurve(address addr) internal view returns (bool) {
        for (uint i = 0; i < allBondingCurves.length; i++) {
            if (allBondingCurves[i] == addr) {
                return true;
            }
        }
        return false;
    }
    
    // Update the market cap of a token
    function updateMarketCap(address bondingCurve) public {
        uint256 marketCap = IBondingCurve(bondingCurve).getMarketCap();
        lastKnownMarketCaps[bondingCurve] = marketCap;
        emit MarketCapUpdated(bondingCurve, marketCap);
    }

    // Get all bonding curves
    function getAllBondingCurves() external view returns (address[] memory) {
        return allBondingCurves;
    }
    
    // Helper function to get token metadata
    function getTokenMetadata(address tokenAddress) public view returns (TokenMetadata memory) {
        IBondingCurve token = IBondingCurve(tokenAddress);
        
        (
            string memory name,
            string memory symbol,
            string memory tokenDescription,
            string memory tokenImageUrl,
            uint256 tokenCreationTime,
            uint256 marketCap,
            bool isMigrated
        ) = token.getTokenMetadata();
        
        return TokenMetadata(
            tokenAddress,
            name,
            symbol,
            tokenDescription,
            tokenImageUrl,
            tokenCreationTime,
            marketCap,
            isMigrated
        );
    }
    
    // Get newest tokens (most recent 4)
    function getNewestTokens() external view returns (TokenMetadata[] memory) {
        uint256 count = allBondingCurves.length > 4 ? 4 : allBondingCurves.length;
        TokenMetadata[] memory newest = new TokenMetadata[](count);
        
        // Create a copy of addresses and creation times for sorting
        address[] memory tokens = new address[](allBondingCurves.length);
        uint256[] memory times = new uint256[](allBondingCurves.length);
        
        for (uint i = 0; i < allBondingCurves.length; i++) {
            tokens[i] = allBondingCurves[i];
            times[i] = creationTimes[allBondingCurves[i]];
        }
        
        // Sort by creation time (descending)
        sortByCreationTime(tokens, times);
        
        // Get metadata for newest tokens
        for (uint i = 0; i < count; i++) {
            newest[i] = getTokenMetadata(tokens[i]);
        }
        
        return newest;
    }
    
    // Helper function to sort tokens by creation time
    function sortByCreationTime(address[] memory tokens, uint256[] memory times) internal pure {
        for (uint i = 0; i < tokens.length; i++) {
            for (uint j = i + 1; j < tokens.length; j++) {
                if (times[i] < times[j]) {
                    // Swap times
                    uint256 tempTime = times[i];
                    times[i] = times[j];
                    times[j] = tempTime;
                    
                    // Swap tokens
                    address tempToken = tokens[i];
                    tokens[i] = tokens[j];
                    tokens[j] = tempToken;
                }
            }
        }
    }
    

    function getAllPairs() external view returns (address[] memory) {
        address[] memory pairs = new address[](allBondingCurves.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < allBondingCurves.length; i++) {
            if (tokenToPair[allBondingCurves[i]] != address(0)) {
                pairs[count] = tokenToPair[allBondingCurves[i]];
                count++;
            }
        }
        
        return pairs;
    }

    function getUserData(address user) external view returns (Trade[] memory) {
        return userTrades[user];
    }
    
    // Get tokens created by a specific user
    function getUserCreatedTokens(address user) external view returns (TokenMetadata[] memory) {
        address[] memory userTokens = userCreatedCurves[user];
        TokenMetadata[] memory result = new TokenMetadata[](userTokens.length);
        
        for (uint i = 0; i < userTokens.length; i++) {
            result[i] = getTokenMetadata(userTokens[i]);
        }
        
        return result;
    }

    function getMigratedPairs() external view returns (address[] memory) {
        return migratedPairs;
    }
}
