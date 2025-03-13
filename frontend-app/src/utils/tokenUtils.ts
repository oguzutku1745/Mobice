import { ethers } from 'ethers';
import { getProviderAndSigner } from './blockchain';
import { config } from './config';

// TokenMetadata struct from the contract
interface TokenMetadataStruct {
  tokenAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  creationTime: bigint;
  marketCap: bigint;
  migrated: boolean;
}

// ABI for BondingCurveFactory - updated to match the contract
const factoryAbi = [
  "function getAllBondingCurves() external view returns (address[] memory)",
  "function getNewestTokens() external view returns (tuple(address tokenAddress, string name, string symbol, string description, string imageUrl, uint256 creationTime, uint256 marketCap, bool migrated)[] memory)",
  "function getUserCreatedTokens(address user) external view returns (tuple(address tokenAddress, string name, string symbol, string description, string imageUrl, uint256 creationTime, uint256 marketCap, bool migrated)[] memory)",
  "function getTokenMetadata(address tokenAddress) external view returns (tuple(address tokenAddress, string name, string symbol, string description, string imageUrl, uint256 creationTime, uint256 marketCap, bool migrated))"
];

// ABI for BondingCurve - only the functions we need
const tokenAbi = [
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function description() external view returns (string memory)",
  "function imageUrl() external view returns (string memory)",
  "function creationTime() external view returns (uint256)",
  "function getMarketCap() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function getTokenMetadata() external view returns (string tokenName, string tokenSymbol, string tokenDescription, string tokenImageUrl, uint256 tokenCreationTime, uint256 marketCap, bool isMigrated)"
];

export interface TokenData {
  id: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  creationTime: number;
  marketCap: string;
  migrated?: boolean;
  pairAddress?: string;
}

/**
 * Fetches all tokens from the factory contract
 */
export async function getAllTokens(): Promise<TokenData[]> {
  try {
    const { provider } = await getProviderAndSigner();
    if (!provider) {
      console.error("Provider not available");
      return [];
    }

    const factoryAddress = config.getCurrentAddresses().factoryAddress;
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
    
    // Get all token addresses
    const tokenAddresses = await factory.getAllBondingCurves();
    
    // Fetch details for each token
    const tokens = await Promise.all(
      tokenAddresses.map(async (address: string) => {
        return await getTokenDetails(address);
      })
    );
    
    return tokens.filter((token): token is TokenData => token !== null);
  } catch (error) {
    console.error("Error fetching all tokens:", error);
    return [];
  }
}

/**
 * Fetches the newest tokens from the factory contract
 */
export async function getNewestTokens(count: number = 5): Promise<TokenData[]> {
  try {
    const { provider } = await getProviderAndSigner();
    if (!provider) {
      console.error("Provider not available");
      return [];
    }

    const factoryAddress = config.getCurrentAddresses().factoryAddress;
    console.log("Factory address:", factoryAddress);
    
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
    
    try {
      // Get newest tokens directly as TokenMetadata structs
      console.log("Calling getNewestTokens on factory...");
      const newestTokens = await factory.getNewestTokens();
      console.log("Newest tokens:", newestTokens);
      
      // Get details for each token with correct market cap
      const tokenPromises = newestTokens.map(async (token: TokenMetadataStruct) => {
        try {
          return await getTokenDetails(token.tokenAddress);
        } catch (err) {
          console.error(`Error getting details for token ${token.tokenAddress}:`, err);
          return null;
        }
      });
      
      const tokens = (await Promise.all(tokenPromises))
        .filter((token): token is TokenData => token !== null);
      
      // Limit to requested count
      return tokens.slice(0, count);
    } catch (error) {
      console.error("Error calling getNewestTokens:", error);
      
      // Fallback to getAllBondingCurves and sort manually
      console.log("Falling back to getAllBondingCurves...");
      const allTokenAddresses = await factory.getAllBondingCurves();
      console.log("All token addresses:", allTokenAddresses);
      
      if (allTokenAddresses.length === 0) {
        console.log("No tokens found");
        return [];
      }
      
      // Get details for each token
      const tokenPromises = allTokenAddresses.map(async (address: string) => {
        try {
          return await getTokenDetails(address);
        } catch (err) {
          console.error(`Error getting details for token ${address}:`, err);
          return null;
        }
      });
      
      const tokens = (await Promise.all(tokenPromises))
        .filter((token): token is TokenData => token !== null)
        .sort((a, b) => b.creationTime - a.creationTime); // Sort by creation time (newest first)
      
      return tokens.slice(0, count);
    }
  } catch (error) {
    console.error("Error fetching newest tokens:", error);
    return [];
  }
}

/**
 * Fetches tokens created by a specific user
 */
export async function getUserCreatedTokens(userAddress: string): Promise<TokenData[]> {
  try {
    const { provider } = await getProviderAndSigner();
    if (!provider) {
      console.error("Provider not available");
      return [];
    }

    const factoryAddress = config.getCurrentAddresses().factoryAddress;
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
    
    // Get user created tokens directly as TokenMetadata structs
    const userTokens = await factory.getUserCreatedTokens(userAddress);
    
    // Get details for each token with correct market cap
    const tokenPromises = userTokens.map(async (token: TokenMetadataStruct) => {
      try {
        return await getTokenDetails(token.tokenAddress);
      } catch (err) {
        console.error(`Error getting details for token ${token.tokenAddress}:`, err);
        return null;
      }
    });
    
    return (await Promise.all(tokenPromises))
      .filter((token): token is TokenData => token !== null);
  } catch (error) {
    console.error("Error fetching user created tokens:", error);
    return [];
  }
}

/**
 * Fetches details for a specific token
 */
export async function getTokenDetails(tokenAddress: string, skipCache: boolean = false): Promise<TokenData | null> {
  try {
    const { provider, signer } = await getProviderAndSigner();
    if (!provider) {
      console.error("Provider not available");
      return null;
    }
    
    const factoryAddress = config.getCurrentAddresses().factoryAddress;
    
    // Get token metadata from factory
    const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
    
    // Create token contract instance to get state variables for market cap calculation
    const tokenContractAbi = [
      ...tokenAbi,
      "function virtualTokens() external view returns (uint256)",
      "function virtualETH() external view returns (uint256)",
      "function INITIAL_VIRTUAL_TOKENS() external view returns (uint256)"
    ];
    const tokenContract = new ethers.Contract(tokenAddress, tokenContractAbi, provider);
    
    // Get token metadata and state variables in parallel
    const [metadata, virtualTokens, virtualETH, initialVirtualTokens] = await Promise.all([
      factory.getTokenMetadata(tokenAddress),
      tokenContract.virtualTokens(),
      tokenContract.virtualETH(),
      tokenContract.INITIAL_VIRTUAL_TOKENS()
    ]);
    
    // Calculate market cap using BigNumber to avoid precision issues
    // Formula: marketCap = (virtualETH / virtualTokens) * (initialVirtualTokens - virtualTokens)
    
    // First, calculate the current price (virtualETH / virtualTokens)
    // We need to scale this up to avoid precision loss in integer division
    const PRECISION = ethers.BigNumber.from(10).pow(36); // Use 10^36 for high precision
    
    // Calculate price = (virtualETH * PRECISION) / virtualTokens
    const scaledPrice = virtualETH.mul(PRECISION).div(virtualTokens);
    
    // Calculate tokens sold = initialVirtualTokens - virtualTokens
    const tokensSold = initialVirtualTokens.sub(virtualTokens);
    
    // Calculate market cap = (scaledPrice * tokensSold) / PRECISION
    const marketCapBN = scaledPrice.mul(tokensSold).div(PRECISION);
    
    // Format to ETH
    const marketCap = ethers.utils.formatEther(marketCapBN);
    
    console.log(`Token ${tokenAddress} state:`, {
      virtualTokens: ethers.utils.formatEther(virtualTokens),
      virtualETH: ethers.utils.formatEther(virtualETH),
      initialVirtualTokens: ethers.utils.formatEther(initialVirtualTokens),
      scaledPrice: scaledPrice.toString(),
      tokensSold: ethers.utils.formatEther(tokensSold),
      marketCap
    });
    
    return {
      id: tokenAddress,
      name: metadata.name,
      symbol: metadata.symbol,
      description: metadata.description,
      imageUrl: metadata.imageUrl || undefined,
      creationTime: Number(metadata.creationTime),
      marketCap,
      migrated: metadata.migrated,
      pairAddress: undefined
    };
  } catch (error) {
    console.error(`Error fetching details for token ${tokenAddress}:`, error);
    
    // Fallback to direct token contract calls if factory method fails
    try {
      const { provider } = await getProviderAndSigner();
      if (!provider) {
        console.error("Provider not available for fallback");
        return null;
      }
      
      // Extended token ABI to include state variables
      const extendedTokenAbi = [
        ...tokenAbi,
        "function virtualTokens() external view returns (uint256)",
        "function virtualETH() external view returns (uint256)",
        "function INITIAL_VIRTUAL_TOKENS() external view returns (uint256)"
      ];
      
      const token = new ethers.Contract(tokenAddress, extendedTokenAbi, provider);
      
      // Fetch token details and state variables
      const [
        name, 
        symbol, 
        description, 
        imageUrl, 
        creationTimeRaw, 
        virtualTokens,
        virtualETH,
        initialVirtualTokens
      ] = await Promise.all([
        token.name(),
        token.symbol(),
        token.description(),
        token.imageUrl(),
        token.creationTime(),
        token.virtualTokens(),
        token.virtualETH(),
        token.INITIAL_VIRTUAL_TOKENS()
      ]);
      
      // Calculate market cap using BigNumber to avoid precision issues
      const PRECISION = ethers.BigNumber.from(10).pow(36);
      const scaledPrice = virtualETH.mul(PRECISION).div(virtualTokens);
      const tokensSold = initialVirtualTokens.sub(virtualTokens);
      const marketCapBN = scaledPrice.mul(tokensSold).div(PRECISION);
      const marketCap = ethers.utils.formatEther(marketCapBN);
      
      const creationTime = Number(creationTimeRaw);
      
      console.log(`Token ${tokenAddress} fallback state:`, {
        virtualTokens: ethers.utils.formatEther(virtualTokens),
        virtualETH: ethers.utils.formatEther(virtualETH),
        initialVirtualTokens: ethers.utils.formatEther(initialVirtualTokens),
        scaledPrice: scaledPrice.toString(),
        tokensSold: ethers.utils.formatEther(tokensSold),
        marketCap
      });
      
      return {
        id: tokenAddress,
        name,
        symbol,
        description,
        imageUrl: imageUrl || undefined,
        creationTime,
        marketCap,
        migrated: false,
        pairAddress: undefined
      };
    } catch (fallbackError) {
      console.error(`Fallback error fetching details for token ${tokenAddress}:`, fallbackError);
      return null;
    }
  }
}

// Helper function to format ether values
function formatEther(wei: bigint | string | number): string {
  // Convert to string first to handle all types
  const weiStr = wei.toString();
  return ethers.utils.formatEther(weiStr);
}

/**
 * Fetches trending tokens based on market cap
 */
export async function getTrendingTokens(count: number = 5): Promise<TokenData[]> {
  try {
    // Get all tokens with correct market cap calculation
    const allTokens = await getAllTokens();
    
    // Sort by market cap (descending)
    const sortedTokens = [...allTokens].sort((a, b) => {
      return parseFloat(b.marketCap) - parseFloat(a.marketCap);
    });
    
    console.log("Sorted tokens by market cap:", sortedTokens.map(t => ({
      name: t.name,
      marketCap: t.marketCap
    })));
    
    return sortedTokens.slice(0, count);
  } catch (error) {
    console.error("Error fetching trending tokens:", error);
    return [];
  }
}

/**
 * Formats a timestamp to a readable date string
 */
export function formatCreationTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats market cap to a readable string with appropriate units
 */
export function formatMarketCap(marketCap: string): string {
  const value = parseFloat(marketCap);
  
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M MON`;
  } else if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K MON`;
  } else {
    return `${value.toFixed(4)} MON`;
  }
}

/**
 * Fetches tokens held by a specific user (with non-zero balance)
 */
export async function getUserHeldTokens(userAddress: string): Promise<TokenData[]> {
  try {
    // First, get all tokens
    const allTokens = await getAllTokens();
    
    // Check balance for each token
    const tokenPromises = allTokens.map(async (token) => {
      try {
        const { getTokenBalance } = await import('./blockchain');
        const balance = await getTokenBalance(token.id, userAddress);
        
        // Only include tokens with non-zero balance
        if (parseFloat(balance) > 0) {
          return {
            ...token,
            balance
          };
        }
        return null;
      } catch (err) {
        console.error(`Error getting balance for token ${token.id}:`, err);
        return null;
      }
    });
    
    // Filter out null values (tokens with zero balance)
    return (await Promise.all(tokenPromises))
      .filter((token): token is TokenData & { balance: string } => token !== null);
  } catch (error) {
    console.error("Error fetching user held tokens:", error);
    return [];
  }
} 