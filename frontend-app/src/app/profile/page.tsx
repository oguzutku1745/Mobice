'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { getProviderAndSigner } from '../../utils/blockchain';
import { useRouter } from 'next/navigation';
import { getUserCreatedTokens, getUserHeldTokens, TokenData, formatMarketCap } from '../../utils/tokenUtils';
import Link from 'next/link';

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState('0');
  const [networkInfo, setNetworkInfo] = useState<{ name: string; chainId: number } | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // State for user tokens
  const [userTokens, setUserTokens] = useState<TokenData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  
  // State for held tokens
  const [heldTokens, setHeldTokens] = useState<(TokenData & { balance: string })[]>([]);
  const [isLoadingHeldTokens, setIsLoadingHeldTokens] = useState(false);
  
  // Check if wallet is connected on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      setIsLoading(true);
      try {
        // Check if MetaMask is installed
        if (typeof window !== 'undefined' && window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            // User is connected
            setWalletAddress(accounts[0]);
            
            // Get network information
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const networkName = getNetworkName(parseInt(chainId, 16));
            setNetworkInfo({ name: networkName, chainId: parseInt(chainId, 16) });
            
            // Get balance
            const { provider } = await getProviderAndSigner();
            if (provider) {
              const balanceWei = await provider.getBalance(accounts[0]);
              const balanceEth = parseFloat(balanceWei.toString()) / 1e18;
              setBalance(balanceEth.toFixed(4));
            }
            
            // Load user tokens
            loadUserTokens(accounts[0]);
            
            // Load held tokens
            loadHeldTokens(accounts[0]);
          } else {
            // User is not connected, redirect to home
            router.push('/');
          }
        } else {
          // MetaMask not installed, redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkWalletConnection();
    
    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          loadUserTokens(accounts[0]);
          loadHeldTokens(accounts[0]);
        } else {
          // User disconnected, redirect to home
          router.push('/');
        }
      });
    }
    
    return () => {
      // Clean up listeners
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
      }
    };
  }, [router]);

  // Load user tokens
  const loadUserTokens = async (address: string) => {
    setIsLoadingTokens(true);
    try {
      const tokens = await getUserCreatedTokens(address);
      setUserTokens(tokens);
    } catch (error) {
      console.error('Error loading user tokens:', error);
    } finally {
      setIsLoadingTokens(false);
    }
  };
  
  // Load held tokens
  const loadHeldTokens = async (address: string) => {
    setIsLoadingHeldTokens(true);
    try {
      const tokens = await getUserHeldTokens(address);
      setHeldTokens(tokens as (TokenData & { balance: string })[]);
    } catch (error) {
      console.error('Error loading held tokens:', error);
    } finally {
      setIsLoadingHeldTokens(false);
    }
  };

  // Helper function to get network name from chain ID
  const getNetworkName = (chainId: number): string => {
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      42: 'Kovan Testnet',
      31337: 'Hardhat Local',
      10143: 'MONAD Testnet',
    };
    
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);
      
      // Reset the success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address: ', err);
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-heading">Profile</h1>
      
      <div className="bg-card rounded-lg shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {walletAddress.substring(2, 4).toUpperCase()}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2 text-heading">Wallet Address</h2>
            <p className="text-secondary font-mono mb-4 bg-highlight p-2 rounded-lg">
              {walletAddress}
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold mb-2 text-heading">Balance</h2>
                <p className="text-secondary">
                  <span className="font-bold text-2xl">{balance}</span> {networkInfo?.name === 'MONAD Testnet' ? 'MON' : 'ETH'}
                </p>
              </div>
            </div>
            
            <button 
              onClick={handleCopyAddress}
              className={`${
                copySuccess 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center shadow-md`}
            >
              {copySuccess ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Tokens Held Section */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-heading">Your Token Holdings</h2>
          <Link 
            href="/" 
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Explore Tokens
          </Link>
        </div>
        
        {isLoadingHeldTokens ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : heldTokens.length === 0 ? (
          <div className="bg-highlight rounded-lg p-6 text-center">
            <p className="text-secondary mb-4">You don't hold any tokens yet.</p>
            <Link 
              href="/" 
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Browse Tokens to Buy
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-theme text-heading">
                  <th className="text-left py-3">Token</th>
                  <th className="text-left py-3">Symbol</th>
                  <th className="text-right py-3">Balance</th>
                  <th className="text-right py-3">Market Cap</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {heldTokens.map((token) => (
                  <tr key={token.id} className="border-b border-theme text-card-text">
                    <td className="py-3">{token.name}</td>
                    <td className="py-3">{token.symbol}</td>
                    <td className="text-right py-3">{parseFloat(token.balance).toFixed(4)}</td>
                    <td className="text-right py-3">{formatMarketCap(token.marketCap)}</td>
                    <td className="text-right py-3">
                      <Link 
                        href={`/token/${token.id}`}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        Trade
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Your Created Tokens Section */}
      <div className="bg-card rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-heading">Your Dropped Tokens</h2>
          <Link 
            href="/create-token" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Create New Token
          </Link>
        </div>
        
        {isLoadingTokens ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : userTokens.length === 0 ? (
          <div className="bg-highlight rounded-lg p-6 text-center">
            <p className="text-secondary mb-4">You haven't created any tokens yet.</p>
            <Link 
              href="/create-token" 
              className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Create Your First Token
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-theme text-heading">
                  <th className="text-left py-3">Token</th>
                  <th className="text-left py-3">Symbol</th>
                  <th className="text-right py-3">Market Cap</th>
                  <th className="text-right py-3">Status</th>
                  <th className="text-right py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {userTokens.map((token) => (
                  <tr key={token.id} className="border-b border-theme text-card-text">
                    <td className="py-3">{token.name}</td>
                    <td className="py-3">{token.symbol}</td>
                    <td className="text-right py-3">{formatMarketCap(token.marketCap)}</td>
                    <td className="text-right py-3">
                      {token.migrated ? (
                        <span className="inline-block bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                          Migrated
                        </span>
                      ) : (
                        <span className="inline-block bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="text-right py-3">
                      <Link 
                        href={`/token/${token.id}`}
                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 