'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTokenDetails, formatMarketCap, formatCreationTime, TokenData } from '@/utils/tokenUtils';
import { getProviderAndSigner } from '@/utils/blockchain';
import Link from 'next/link';
import { ethers } from 'ethers';

export default function TokenDetailPage() {
  const params = useParams();
  const tokenId = params.id as string;
  
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [transactionPending, setTransactionPending] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{ thresholdReached: boolean; isOwner: boolean } | null>(null);

  // Function to fetch token details
  async function fetchTokenDetails(forceRefresh = false) {
    try {
      setLoading(true);
      
      const { signer, provider } = await getProviderAndSigner();
      const isConnected = !!signer;
      setWalletConnected(isConnected);
      
      // Fetch token details - update to match new signature
      const tokenData = await getTokenDetails(tokenId);
      if (tokenData) {
        setToken(tokenData);
        
        // Check if token is migrated
        if (provider) {
          const tokenAbi = [
            "function migrated() external view returns (bool)",
            "function pairAddress() external view returns (address)"
          ];
          const tokenContract = new ethers.Contract(tokenId, tokenAbi, provider);
          
          try {
            const isMigrated = await tokenContract.migrated();
            console.log("Token migration status:", isMigrated);
            
            if (isMigrated) {
              // Get the liquidity pool address
              const pairAddress = await tokenContract.pairAddress();
              console.log("Liquidity pool address:", pairAddress);
              
              // Update token data with migration info
              setToken(prevToken => {
                if (!prevToken) return null;
                return {
                  ...prevToken,
                  migrated: true,
                  pairAddress
                };
              });
            }
          } catch (error) {
            console.error("Error checking migration status:", error);
          }
        }
        
        // If wallet is connected, fetch user's balance of this token
        if (isConnected) {
          await fetchUserBalance(tokenId);
        }
      } else {
        setError('Token not found');
      }
    } catch (err) {
      console.error('Error fetching token details:', err);
      setError('Failed to load token details. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tokenId) {
      fetchTokenDetails();
    }
  }, [tokenId]);

  useEffect(() => {
    if (token && !loading) {
      checkMigrationThreshold().then(status => {
        if (status) {
          setMigrationStatus(status);
        }
      });
    }
  }, [token, loading]);

  async function fetchUserBalance(tokenAddress: string) {
    try {
      const { provider, signer } = await getProviderAndSigner();
      if (!signer || !provider) return;
      
      const userAddress = await signer.getAddress();
      console.log("Fetching balance for user:", userAddress);
      
      // Create contract instance for the token
      const tokenAbi = [
        "function balanceOf(address account) external view returns (uint256)",
        "function owner() external view returns (address)"
      ];
      
      // Important: Use signer instead of provider to ensure we're not getting a cached value
      const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, signer);
      
      // Check if the user is the owner of the contract
      const ownerAddress = await tokenContract.owner();
      const isOwner = userAddress.toLowerCase() === ownerAddress.toLowerCase();
      console.log("Contract owner:", ownerAddress);
      console.log("Is user the owner?", isOwner);
      
      if (isOwner) {
        // If the user is the owner, we need to calculate their actual balance
        // The owner starts with all tokens and transfers some to buyers
        // So their balance is (total supply - tokens sold to others)
        
        // Get the total supply and calculate the owner's actual balance
        const totalSupplyAbi = ["function totalSupply() external view returns (uint256)"];
        const totalSupplyContract = new ethers.Contract(tokenAddress, totalSupplyAbi, provider);
        const totalSupply = await totalSupplyContract.totalSupply();
        
        // Get all token holders' balances except the owner
        // This is a simplified approach - in a real app, you'd need to track all transfers
        // For now, we'll just show a message to the owner
        setUserBalance("You are the owner of this token. Your balance includes all unsold tokens.");
        return;
      }
      
      // Get user's balance
      const balance = await tokenContract.balanceOf(userAddress);
      console.log("Raw balance from contract:", balance.toString());
      
      // Format balance
      const formattedBalance = formatEther(balance);
      console.log("Formatted balance:", formattedBalance);
      
      setUserBalance(formattedBalance);
    } catch (error) {
      console.error('Error fetching user balance:', error);
    }
  }

  // Helper function to format ether values
  function formatEther(wei: bigint | string): string {
    if (typeof wei === 'string') {
      wei = BigInt(wei);
    }
    return (Number(wei) / 1e18).toString();
  }

  // Helper function to parse ether values
  function parseEther(ether: string): bigint {
    const etherAmount = parseFloat(ether);
    return BigInt(Math.floor(etherAmount * 1e18));
  }

  // Helper function to parse units
  function parseUnits(value: string, decimals: number): bigint {
    const amount = parseFloat(value);
    return BigInt(Math.floor(amount * 10 ** decimals));
  }

  // Function to directly fetch market cap from the token contract
  async function fetchDirectMarketCap() {
    try {
      const { provider } = await getProviderAndSigner();
      if (!provider || !token) return;
      
      // Create contract instance for the token with extended ABI to check state variables
      const tokenAbi = [
        "function getMarketCap() external view returns (uint256)",
        "function virtualTokens() external view returns (uint256)",
        "function virtualETH() external view returns (uint256)",
        "function k() external view returns (uint256)",
        "function INITIAL_VIRTUAL_TOKENS() external view returns (uint256)"
      ];
      const tokenContract = new ethers.Contract(token.id, tokenAbi, provider);
      
      // Get state variables for calculation
      const [virtualTokens, virtualETH, initialVirtualTokens] = await Promise.all([
        tokenContract.virtualTokens(),
        tokenContract.virtualETH(),
        tokenContract.INITIAL_VIRTUAL_TOKENS()
      ]);
      
      // Convert to JavaScript numbers for calculation
      const vTokens = Number(ethers.utils.formatEther(virtualTokens));
      const vETH = Number(ethers.utils.formatEther(virtualETH));
      const initialVTokens = Number(ethers.utils.formatEther(initialVirtualTokens));
      
      // Calculate market cap manually (using JavaScript floating point)
      const currentPrice = vETH / vTokens;
      const calculatedMarketCap = currentPrice * (initialVTokens - vTokens);
      
      console.log("virtualTokens:", vTokens);
      console.log("virtualETH:", vETH);
      console.log("initialVirtualTokens:", initialVTokens);
      console.log("Current price:", currentPrice);
      console.log("Calculated market cap:", calculatedMarketCap);
      console.log("===========================");
      
      // Format the calculated market cap as a string
      const marketCap = calculatedMarketCap.toString();
      console.log("Using calculated market cap:", marketCap);
      
      // Update token with calculated market cap
      setToken(prevToken => {
        if (!prevToken) return null;
        return {
          ...prevToken,
          marketCap
        };
      });
    } catch (error) {
      console.error('Error calculating market cap:', error);
    }
  }

  // Function to check if migration threshold has been reached
  async function checkMigrationThreshold() {
    try {
      const { provider, signer } = await getProviderAndSigner();
      if (!provider || !token) return false;
      
      // Create contract instance for the token
      const tokenAbi = [
        "function virtualTokens() external view returns (uint256)",
        "function INITIAL_VIRTUAL_TOKENS() external view returns (uint256)",
        "function MIGRATION_THRESHOLD() external view returns (uint256)",
        "function migrated() external view returns (bool)",
        "function owner() external view returns (address)"
      ];
      const tokenContract = new ethers.Contract(token.id, tokenAbi, provider);
      
      // Check if already migrated
      const isMigrated = await tokenContract.migrated();
      if (isMigrated) return false;
      
      // Get current state
      const [virtualTokens, initialVirtualTokens, migrationThreshold, ownerAddress] = await Promise.all([
        tokenContract.virtualTokens(),
        tokenContract.INITIAL_VIRTUAL_TOKENS(),
        tokenContract.MIGRATION_THRESHOLD(),
        tokenContract.owner()
      ]);
      
      // Calculate migration trigger point
      const migrationTrigger = (BigInt(initialVirtualTokens) * BigInt(migrationThreshold)) / BigInt(100);
      
      // Check if threshold is reached
      const thresholdReached = BigInt(virtualTokens) <= migrationTrigger;
      
      // Check if current user is the owner
      let isOwner = false;
      if (signer) {
        const userAddress = await signer.getAddress();
        isOwner = userAddress.toLowerCase() === ownerAddress.toLowerCase();
      }
      
      console.log("Migration threshold check:", {
        virtualTokens: formatEther(virtualTokens),
        initialVirtualTokens: formatEther(initialVirtualTokens),
        migrationThreshold: migrationThreshold.toString(),
        migrationTrigger: formatEther(migrationTrigger),
        thresholdReached,
        isOwner
      });
      
      return { thresholdReached, isOwner };
    } catch (error) {
      console.error('Error checking migration threshold:', error);
      return false;
    }
  }

  // Function to migrate the bonding curve
  async function handleMigrate() {
    try {
      setTransactionPending(true);
      
      const { signer } = await getProviderAndSigner();
      if (!signer || !token) {
        alert('Please connect your wallet first');
        setTransactionPending(false);
        return;
      }
      
      // Create contract instance for the token
      const tokenAbi = [
        "function migrate() external",
        "function pairAddress() external view returns (address)"
      ];
      const tokenContract = new ethers.Contract(token.id, tokenAbi, signer);
      
      // Execute migration
      const tx = await tokenContract.migrate({
        gasLimit: 3000000 // Higher gas limit for complex operation
      });
      
      console.log("Migration transaction submitted:", tx.hash);
      alert(`Migration transaction submitted! Transaction hash: ${tx.hash}`);
      
      // Wait for transaction to be confirmed
      console.log("Waiting for migration transaction to be confirmed...");
      await tx.wait();
      console.log("Migration transaction confirmed");
      
      // Get the liquidity pool address
      const pairAddress = await tokenContract.pairAddress();
      console.log("Liquidity pool address:", pairAddress);
      
      // Update token data with migration info
      setToken(prevToken => {
        if (!prevToken) return null;
        return {
          ...prevToken,
          migrated: true,
          pairAddress
        };
      });
      
      // Refresh token data
      await fetchTokenDetails(true);
      
      alert('Migration successful! The bonding curve has been migrated to a liquidity pool.');
    } catch (error: any) {
      console.error('Error migrating bonding curve:', error);
      alert(`Failed to migrate bonding curve: ${error.message || 'Unknown error'}`);
    } finally {
      setTransactionPending(false);
    }
  }

  // Update the handleBuyToken function to check migration threshold after purchase
  async function handleBuyToken() {
    if (!token || !buyAmount || parseFloat(buyAmount) <= 0) return;
    
    try {
      setTransactionPending(true);
      
      const { signer, provider } = await getProviderAndSigner();
      if (!signer) {
        alert('Please connect your wallet first');
        setTransactionPending(false);
        return;
      }
      
      // Create contract instance for the token
      const tokenAbi = [
        "function buy(uint256 tokenAmount) external payable",
        "function getPrice(uint256 tokenAmount) external view returns (uint256)",
        "function virtualTokens() external view returns (uint256)",
        "function virtualETH() external view returns (uint256)"
      ];
      const tokenContract = new ethers.Contract(token.id, tokenAbi, signer);
      
      // Get current state
      const [virtualTokens, virtualETH] = await Promise.all([
        tokenContract.virtualTokens(),
        tokenContract.virtualETH()
      ]);
      
      console.log("Current virtualTokens:", formatEther(virtualTokens));
      console.log("Current virtualETH:", formatEther(virtualETH));
      
      // Convert ETH amount to wei
      const ethToSpend = parseEther(buyAmount);
      console.log("ETH to spend:", formatEther(ethToSpend));
      
      // Calculate approximately how many tokens we can buy with this ETH
      // Using the formula: tokenAmount = (k / (virtualETH + ethToSpend)) - virtualTokens
      // But we need to be conservative to ensure we don't exceed the available tokens
      
      // Calculate k = virtualTokens * virtualETH
      const k = (BigInt(virtualTokens) * BigInt(virtualETH)) / BigInt(10**18);
      console.log("k value:", formatEther(k));
      
      // Calculate new virtualETH after our purchase
      const newVirtualETH = BigInt(virtualETH) + BigInt(ethToSpend);
      
      // Calculate new virtualTokens after our purchase
      // newVirtualTokens * newVirtualETH = k
      // newVirtualTokens = k / newVirtualETH
      const newVirtualTokens = (BigInt(k) * BigInt(10**18)) / BigInt(newVirtualETH);
      
      // Calculate token amount to buy
      const tokensToBuy = BigInt(virtualTokens) - BigInt(newVirtualTokens);
      
      // Apply a safety margin (95% of calculated amount) to account for price impact
      const safeTokensToBuy = BigInt(tokensToBuy) * BigInt(95) / BigInt(100);
      
      console.log("Calculated tokens to buy:", formatEther(tokensToBuy));
      console.log("Safe tokens to buy:", formatEther(safeTokensToBuy));
      
      // Get the actual cost for these tokens
      const actualCost = await tokenContract.getPrice(safeTokensToBuy);
      console.log(`Actual cost for ${formatEther(safeTokensToBuy)} tokens: ${formatEther(actualCost)} ETH`);
      
      // Make sure we're sending enough ETH (add 5% buffer)
      const ethToSend = BigInt(actualCost) * BigInt(105) / BigInt(100);
      console.log(`Sending ${formatEther(ethToSend)} ETH to buy tokens`);
      
      // Execute buy transaction
      const tx = await tokenContract.buy(safeTokensToBuy, {
        value: ethToSend,
        gasLimit: 1000000
      });
      
      console.log("Buy transaction submitted:", tx.hash);
      await tx.wait();
      console.log("Buy transaction confirmed");
      
      // Refresh token data and user balance with a small delay to allow blockchain state to update
      console.log("Starting refresh sequence...");
      
      // First refresh - immediate
      try {
        console.log("Immediate refresh attempt");
        await fetchDirectMarketCap();
        await fetchUserBalance(token.id);
        
        // Check if migration threshold has been reached
        const migrationStatus = await checkMigrationThreshold();
        if (migrationStatus && migrationStatus.thresholdReached) {
          if (migrationStatus.isOwner) {
            const shouldMigrate = window.confirm(
              'Migration threshold has been reached! Would you like to migrate the bonding curve to a liquidity pool now?'
            );
            if (shouldMigrate) {
              await handleMigrate();
              return;
            }
          } else {
            alert('Migration threshold has been reached! The owner can now migrate the bonding curve to a liquidity pool.');
          }
        }
      } catch (refreshError) {
        console.error("Error in immediate refresh:", refreshError);
      }
      
      // Second refresh - after delay
      setTimeout(async () => {
        try {
          console.log("Delayed refresh attempt");
          await fetchDirectMarketCap();
          await fetchUserBalance(token.id);
          
          // Force a complete refresh of token details
          await fetchTokenDetails(true);
          
          // One more balance check after everything else
          setTimeout(async () => {
            try {
              console.log("Final balance check");
              await fetchUserBalance(token.id);
            } catch (error) {
              console.error("Error in final balance check:", error);
            }
          }, 2000);
        } catch (refreshError) {
          console.error("Error in delayed refresh:", refreshError);
        }
      }, 3000); // 3 second delay
      
      // Reset input
      setBuyAmount('');
      
      alert('Purchase successful!');
    } catch (error) {
      console.error('Error buying token:', error);
      alert('Failed to buy token. Please try again.');
    } finally {
      setTransactionPending(false);
    }
  }

  async function handleSellToken() {
    if (!token || !sellAmount || parseFloat(sellAmount) <= 0) return;
    
    try {
      setTransactionPending(true);
      
      const { signer } = await getProviderAndSigner();
      if (!signer) {
        alert('Please connect your wallet first');
        setTransactionPending(false);
        return;
      }
      
      // Create contract instance for the token
      const tokenAbi = [
        "function sell(uint256 tokenAmount) external"
      ];
      const tokenContract = new ethers.Contract(token.id, tokenAbi, signer);
      
      // Convert token amount to wei
      const tokenAmount = parseUnits(sellAmount, 18);
      
      // Execute sell transaction
      const tx = await tokenContract.sell(tokenAmount, {
        gasLimit: 1000000
      });
      
      console.log("Sell transaction submitted:", tx.hash);
      await tx.wait();
      console.log("Sell transaction confirmed");
      
      // Refresh token data and user balance with a small delay to allow blockchain state to update
      console.log("Starting refresh sequence...");
      
      // First refresh - immediate
      try {
        console.log("Immediate refresh attempt");
        await fetchDirectMarketCap();
        await fetchUserBalance(token.id);
      } catch (refreshError) {
        console.error("Error in immediate refresh:", refreshError);
      }
      
      // Second refresh - after delay
      setTimeout(async () => {
        try {
          console.log("Delayed refresh attempt");
          await fetchDirectMarketCap();
          await fetchUserBalance(token.id);
          
          // Force a complete refresh of token details
          await fetchTokenDetails(true);
          
          // One more balance check after everything else
          setTimeout(async () => {
            try {
              console.log("Final balance check");
              await fetchUserBalance(token.id);
            } catch (error) {
              console.error("Error in final balance check:", error);
            }
          }, 2000);
        } catch (refreshError) {
          console.error("Error in delayed refresh:", refreshError);
        }
      }, 3000); // 3 second delay
      
      // Reset input
      setSellAmount('');
      
      alert('Sale successful!');
    } catch (error) {
      console.error('Error selling token:', error);
      alert('Failed to sell token. Please try again.');
    } finally {
      setTransactionPending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error || 'Token not found'}
        </div>
        <div className="mt-4">
          <Link href="/" className="text-blue-500 hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      {/* Migration Alert for Owner */}
      {migrationStatus && migrationStatus.thresholdReached && migrationStatus.isOwner && (
        <div className="mb-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded relative">
          <strong className="font-bold">Migration Threshold Reached!</strong>
          <span className="block sm:inline"> This bonding curve is ready to be migrated to a liquidity pool.</span>
          <div className="mt-2">
            <button
              onClick={handleMigrate}
              disabled={transactionPending}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {transactionPending ? 'Processing...' : 'Migrate to Liquidity Pool'}
            </button>
          </div>
        </div>
      )}
      
      {/* Migration Alert for Non-Owner */}
      {migrationStatus && migrationStatus.thresholdReached && !migrationStatus.isOwner && (
        <div className="mb-4 bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded relative">
          <strong className="font-bold">Migration Threshold Reached!</strong>
          <span className="block sm:inline"> This bonding curve is ready to be migrated to a liquidity pool. Only the owner can perform the migration.</span>
        </div>
      )}
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        {/* Token Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            {token.imageUrl ? (
              <img 
                src={token.imageUrl} 
                alt={token.name} 
                className="w-16 h-16 rounded-full mr-4"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-full mr-4 flex items-center justify-center text-white text-2xl font-bold"
                style={{ 
                  background: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)} 0%, #${Math.floor(Math.random()*16777215).toString(16)} 100%)` 
                }}
              >
                {token.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold">{token.name} ({token.symbol})</h1>
              <p className="text-gray-600 dark:text-gray-400">Created on {formatCreationTime(token.creationTime)}</p>
              
              {/* Migration Status Badge */}
              {token.migrated ? (
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Migrated to Liquidity Pool
                </div>
              ) : (
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Active Bonding Curve
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Migration Info Banner */}
        {token.migrated && token.pairAddress && (
          <div className="p-4 bg-green-50 border-b border-green-200">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-green-700">
                This token has been migrated to a Uniswap liquidity pool. You can now trade it on Uniswap.
              </p>
            </div>
            <div className="mt-2">
              <a 
                href={`https://monad-sepolia.etherscan.io/address/${token.pairAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:text-green-800 font-medium"
              >
                View Liquidity Pool →
              </a>
            </div>
          </div>
        )}
        
        {/* Token Details */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">About</h2>
            <p className="text-gray-700 dark:text-gray-300">{token.description}</p>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Market Cap</h3>
              <div className="flex items-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mr-2">
                  {formatMarketCap(token.marketCap)}
                </p>
                
                {/*walletConnected && (
                  <button 
                    onClick={async () => {
                      try {
                        const { signer } = await getProviderAndSigner();
                        if (!signer) return;
                        
                        // Create contract instance for the token
                        const tokenAbi = [
                          "function buy(uint256 tokenAmount) external payable",
                          "function getPrice(uint256 tokenAmount) external view returns (uint256)",
                          "function virtualTokens() external view returns (uint256)",
                          "function virtualETH() external view returns (uint256)"
                        ];
                        const tokenContract = new ethers.Contract(token.id, tokenAbi, signer);
                        
                        // Get current state
                        const [virtualTokens, virtualETH] = await Promise.all([
                          tokenContract.virtualTokens(),
                          tokenContract.virtualETH()
                        ]);
                        
                        console.log("Current virtualTokens:", formatEther(virtualTokens));
                        console.log("Current virtualETH:", formatEther(virtualETH));
                        
                        // Set a test buy amount (2 ETH)
                        const ethToSpend = parseEther("2");
                        console.log("ETH to spend:", formatEther(ethToSpend));
                        
                        // Calculate k = virtualTokens * virtualETH
                        const k = (BigInt(virtualTokens) * BigInt(virtualETH)) / BigInt(10**18);
                        console.log("k value:", formatEther(k));
                        
                        // Calculate new virtualETH after our purchase
                        const newVirtualETH = BigInt(virtualETH) + BigInt(ethToSpend);
                        
                        // Calculate new virtualTokens after our purchase
                        const newVirtualTokens = (BigInt(k) * BigInt(10**18)) / BigInt(newVirtualETH);
                        
                        // Calculate token amount to buy
                        const tokensToBuy = BigInt(virtualTokens) - BigInt(newVirtualTokens);
                        
                        // Apply a safety margin (95% of calculated amount)
                        const safeTokensToBuy = BigInt(tokensToBuy) * BigInt(95) / BigInt(100);
                        
                        console.log("Calculated tokens to buy:", formatEther(tokensToBuy));
                        console.log("Safe tokens to buy:", formatEther(safeTokensToBuy));
                        
                        // Get the actual cost for these tokens
                        const actualCost = await tokenContract.getPrice(safeTokensToBuy);
                        console.log(`Actual cost for ${formatEther(safeTokensToBuy)} tokens: ${formatEther(actualCost)} ETH`);
                        
                        // Add a buffer for price changes
                        const ethToSend = BigInt(actualCost) * BigInt(105) / BigInt(100);
                        console.log(`Sending ${formatEther(ethToSend)} ETH to buy tokens`);
                        
                        // Buy tokens
                        const tx = await tokenContract.buy(safeTokensToBuy, {
                          value: ethToSend,
                          gasLimit: 1000000
                        });
                        
                        console.log("Test buy submitted:", tx.hash);
                        await tx.wait();
                        console.log("Test buy confirmed");
                        
                        // Refresh market cap
                        await fetchDirectMarketCap();
                        await fetchUserBalance(token.id);
                      } catch (error) {
                        console.error("Test buy error:", error);
                      }
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm px-2 py-1 rounded-md"
                  >
                    Test Buy
                  </button>
                )*/}
              </div>
            </div>
            
            {walletConnected && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Your Balance</h3>
                <div className="flex items-center">
                  {userBalance.startsWith("You are the owner") ? (
                    <div>
                      <p className="text-amber-600 dark:text-amber-400 mb-2">
                        {userBalance}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        As the owner, you initially hold all tokens. When users buy tokens, they are transferred from your balance.
                      </p>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mr-2">
                      {parseFloat(userBalance).toLocaleString()} {token.symbol}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Trading Panel */}
          <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Trade {token.symbol}</h2>
            
            {token.migrated ? (
              <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-lg mb-4">
                <p className="text-blue-800 dark:text-blue-200">
                  This token has been migrated to a liquidity pool. You can now trade it on Uniswap.
                </p>
                {token.pairAddress && (
                  <a 
                    href={`https://monad-sepolia.etherscan.io/address/${token.pairAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Liquidity Pool →
                  </a>
                )}
              </div>
            ) : !walletConnected ? (
              <div className="bg-yellow-100 dark:bg-yellow-800 p-4 rounded-lg mb-4">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Connect your wallet to trade this token
                </p>
              </div>
            ) : (
              <>
                {/* Buy Panel */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Buy {token.symbol}</h3>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      placeholder="MON amount"
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={transactionPending}
                    />
                    <button
                      onClick={handleBuyToken}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-r-md disabled:opacity-50"
                      disabled={!buyAmount || parseFloat(buyAmount) <= 0 || transactionPending}
                    >
                      {transactionPending ? 'Processing...' : 'Buy'}
                    </button>
                  </div>
                </div>
                
                {/* Sell Panel */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Sell {token.symbol}</h3>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder={`${token.symbol} amount`}
                      className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={transactionPending}
                    />
                    <button
                      onClick={handleSellToken}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-r-md disabled:opacity-50"
                      disabled={!sellAmount || parseFloat(sellAmount) <= 0 || transactionPending}
                    >
                      {transactionPending ? 'Processing...' : 'Sell'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 