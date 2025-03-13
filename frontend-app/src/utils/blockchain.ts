import { ethers } from 'ethers';
import { config } from './config';

// Define types for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}

// Get contract addresses from config
const { factoryAddress, routerAddress } = config.getCurrentAddresses();

// Factory ABI - updated to match the contract implementation
const FACTORY_ABI = [
  "function createBondingCurve(string name, string symbol, string description, string imageUrl, address _thirdTradeDex, address _uniswapRouter) external",
  "function getAllBondingCurves() external view returns (address[])",
  "function getNewestTokens() external view returns (tuple(address tokenAddress, string name, string symbol, string description, string imageUrl, uint256 creationTime, uint256 marketCap, bool migrated)[] memory)",
  "function getUserCreatedTokens(address user) external view returns (tuple(address tokenAddress, string name, string symbol, string description, string imageUrl, uint256 creationTime, uint256 marketCap, bool migrated)[] memory)",
  "function getTokenMetadata(address tokenAddress) external view returns (tuple(address tokenAddress, string name, string symbol, string description, string imageUrl, uint256 creationTime, uint256 marketCap, bool migrated))"
];

// Bonding Curve ABI - simplified version with just the functions we need
const BONDING_CURVE_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function description() external view returns (string)",
  "function imageUrl() external view returns (string)",
  "function creationTime() external view returns (uint256)",
  "function getMarketCap() external view returns (uint256)",
  "function buy(uint256 tokenAmount) external payable",
  "function sell(uint256 tokenAmount) external",
  "function balanceOf(address account) external view returns (uint256)",
  "function migrate() external",
  "function migrated() external view returns (bool)",
  "function owner() external view returns (address)",
  "function getTokenMetadata() external view returns (string tokenName, string tokenSymbol, string tokenDescription, string tokenImageUrl, uint256 tokenCreationTime, uint256 marketCap, bool isMigrated)"
];

/**
 * Gets the provider and signer for interacting with the blockchain
 */
export async function getProviderAndSigner(): Promise<{ provider: ethers.providers.Web3Provider | null, signer: ethers.Signer | null }> {
  try {
    // Check if window is defined (browser environment)
    if (typeof window === 'undefined' || !window.ethereum) {
      console.log("MetaMask not installed or not in browser environment");
      return { provider: null, signer: null };
    }

    // Request account access if needed
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Create provider and signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    return { provider, signer };
  } catch (error) {
    console.error("Error getting provider and signer:", error);
    return { provider: null, signer: null };
  }
}

/**
 * Get factory contract instance
 */
export async function getFactoryContract(signer: ethers.providers.JsonRpcSigner | ethers.providers.Web3Provider | null = null) {
  const { provider, signer: defaultSigner } = await getProviderAndSigner();
  const signerOrProvider = signer || defaultSigner || provider;
  
  if (!signerOrProvider) {
    throw new Error("No provider or signer available");
  }
  
  return new ethers.Contract(factoryAddress, FACTORY_ABI, signerOrProvider);
}

/**
 * Get token contract instance
 */
export async function getTokenContract(tokenAddress: string, signer: ethers.providers.JsonRpcSigner | ethers.providers.Web3Provider | null = null) {
  const { provider, signer: defaultSigner } = await getProviderAndSigner();
  const signerOrProvider = signer || defaultSigner || provider;
  
  if (!signerOrProvider) {
    throw new Error("No provider or signer available");
  }
  
  return new ethers.Contract(tokenAddress, BONDING_CURVE_ABI, signerOrProvider);
}

// Create a new token
export async function createToken(name: string, symbol: string, description: string, imageUrl: string) {
  try {
    const { signer } = await getProviderAndSigner();
    if (!signer) throw new Error('No signer available');
    
    const factory = await getFactoryContract(signer);
    if (!factory) throw new Error('Factory contract not available');
    
    // Create the token
    const tx = await factory.createBondingCurve(
      name,
      symbol,
      description,
      imageUrl,
      "0x0000000000000000000000000000000000000000", // Third trade dex (not used)
      routerAddress // Uniswap router
    );
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  }
}

// Get all tokens
export async function getAllTokens() {
  try {
    const { provider } = await getProviderAndSigner();
    if (!provider) throw new Error('No provider available');
    
    const factoryContract = await getFactoryContract(provider);
    if (!factoryContract) throw new Error('Factory contract not available');
    
    // Call the getAllBondingCurves function on the factory
    const tokenAddresses = await factoryContract.getAllBondingCurves();
    console.log("Token addresses:", tokenAddresses);
    
    // Get metadata for each token
    const tokens = await Promise.all(
      tokenAddresses.map(async (address: string) => {
        try {
          const metadata = await factoryContract.getTokenMetadata(address);
          return {
            tokenAddress: address,
            name: metadata.name,
            symbol: metadata.symbol,
            description: metadata.description,
            imageUrl: metadata.imageUrl,
            creationTime: Number(metadata.creationTime),
            marketCap: ethers.utils.formatEther(metadata.marketCap),
            migrated: metadata.migrated
          };
        } catch (error) {
          console.error(`Error getting metadata for token ${address}:`, error);
          return null;
        }
      })
    );
    
    return tokens.filter(Boolean); // Filter out any null values
  } catch (error) {
    console.error('Error getting all tokens:', error);
    throw error; // Rethrow to see the exact error in the console
  }
}

// Buy tokens
export async function buyTokens(tokenAddress: string, ethAmount: string, minTokens: string) {
  try {
    const { signer } = await getProviderAndSigner();
    if (!signer) throw new Error('No signer available');
    
    const tokenContract = await getTokenContract(tokenAddress, signer);
    if (!tokenContract) throw new Error('Token contract not available');
    
    // Convert ETH amount to wei
    const weiAmount = ethers.utils.parseEther(ethAmount);
    
    // Convert min tokens to wei
    const minTokensWei = ethers.utils.parseUnits(minTokens, 18);
    
    // Execute buy transaction
    const tx = await tokenContract.buy(minTokensWei, {
      value: weiAmount,
      gasLimit: 1000000
    });
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error('Error buying tokens:', error);
    throw error;
  }
}

// Sell tokens
export async function sellTokens(tokenAddress: string, tokenAmount: string, minEth: string) {
  try {
    const { signer } = await getProviderAndSigner();
    if (!signer) throw new Error('No signer available');
    
    const tokenContract = await getTokenContract(tokenAddress, signer);
    if (!tokenContract) throw new Error('Token contract not available');
    
    // Convert token amount to wei
    const tokenAmountWei = ethers.utils.parseUnits(tokenAmount, 18);
    
    // Convert min ETH to wei
    const minEthWei = ethers.utils.parseEther(minEth);
    
    // Execute sell transaction
    const tx = await tokenContract.sell(tokenAmountWei, minEthWei, {
      gasLimit: 1000000
    });
    
    // Wait for the transaction to be mined
    const receipt = await tx.wait();
    
    return receipt;
  } catch (error) {
    console.error('Error selling tokens:', error);
    throw error;
  }
}

// Get token details
export async function getTokenDetails(tokenAddress: string) {
  try {
    const { provider } = await getProviderAndSigner();
    if (!provider) throw new Error('No provider available');
    
    const factoryContract = await getFactoryContract(provider);
    if (!factoryContract) throw new Error('Factory contract not available');
    
    // Get token metadata from factory
    try {
      const metadata = await factoryContract.getTokenMetadata(tokenAddress);
      console.log("Token metadata from factory:", metadata);
      
      return {
        tokenAddress: tokenAddress,
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        imageUrl: metadata.imageUrl,
        creationTime: Number(metadata.creationTime),
        marketCap: ethers.utils.formatEther(metadata.marketCap),
        migrated: metadata.migrated
      };
    } catch (factoryError) {
      console.error('Error getting token details from factory:', factoryError);
      
      // Fallback to direct token contract call
      const tokenContract = await getTokenContract(tokenAddress, provider);
      if (!tokenContract) throw new Error('Token contract not available');
      
      // Get token metadata directly from token contract
      const metadata = await tokenContract.getTokenMetadata();
      console.log("Token metadata from token contract:", metadata);
      
      return {
        tokenAddress: tokenAddress,
        name: metadata.tokenName,
        symbol: metadata.tokenSymbol,
        description: metadata.tokenDescription,
        imageUrl: metadata.tokenImageUrl,
        creationTime: Number(metadata.tokenCreationTime),
        marketCap: ethers.utils.formatEther(metadata.marketCap),
        migrated: metadata.isMigrated
      };
    }
  } catch (error) {
    console.error('Error getting token details:', error);
    throw error;
  }
}

// Update contract addresses after deployment
export const updateContractAddresses = (newFactoryAddress: string) => {
  // In a real app, you might store this in localStorage or a config file
  console.log('Updated factory address:', newFactoryAddress);
};

// Get token balance
export async function getTokenBalance(tokenAddress: string, userAddress: string) {
  try {
    const { provider } = await getProviderAndSigner();
    if (!provider) throw new Error('No provider available');
    
    const tokenContract = await getTokenContract(tokenAddress, provider);
    if (!tokenContract) throw new Error('Token contract not available');
    
    // Get balance
    const balance = await tokenContract.balanceOf(userAddress);
    
    // Convert to readable format
    return ethers.utils.formatUnits(balance, 18);
  } catch (error) {
    console.error('Error getting token balance:', error);
    throw error;
  }
} 