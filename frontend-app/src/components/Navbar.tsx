'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { getProviderAndSigner } from '../utils/blockchain';

// Define network interface
interface Network {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  blockExplorerUrl?: string;
}

const Navbar = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{ name: string; chainId: number } | null>(null);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available networks
  const networks: Network[] = [
    { 
      name: 'Hardhat Local', 
      chainId: 1337, 
      rpcUrl: 'http://localhost:8545',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
    },
    { 
      name: 'MONAD Testnet', 
      chainId: 10143, 
      rpcUrl: 'https://testnet-rpc2.monad.xyz/52227f026fa8fac9e2014c58fbf5643369b3bfc6',
      nativeCurrency: {
        name: 'MON',
        symbol: 'MON',
        decimals: 18
      },
      blockExplorerUrl: 'https://testnet.monadexplorer.com/'
    },
    { 
      name: 'Ethereum Mainnet', 
      chainId: 1, 
      rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      },
      blockExplorerUrl: 'https://etherscan.io'
    },
  ];

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setIsConnected(true);
            setWalletAddress(accounts[0]);
            
            // Get network information
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const networkName = getNetworkName(parseInt(chainId, 16));
            setNetworkInfo({ name: networkName, chainId: parseInt(chainId, 16) });
            console.log(`Connected to network: ${networkName} (Chain ID: ${parseInt(chainId, 16)})`);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setIsConnected(true);
          setWalletAddress(accounts[0]);
        } else {
          setIsConnected(false);
          setWalletAddress('');
          setNetworkInfo(null);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', (chainId: string) => {
        const networkName = getNetworkName(parseInt(chainId, 16));
        setNetworkInfo({ name: networkName, chainId: parseInt(chainId, 16) });
        console.log(`Network changed to: ${networkName} (Chain ID: ${parseInt(chainId, 16)})`);
      });
    }

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNetworkDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      // Clean up listeners when component unmounts
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper function to get network name from chain ID
  const getNetworkName = (chainId: number): string => {
    const networks: Record<number, string> = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      42: 'Kovan Testnet',
      1337: 'Hardhat Local',
      31337: 'Hardhat Local', // Include both possible Hardhat chain IDs
      10143: 'MONAD Testnet',
    };
    
    return networks[chainId] || `Unknown Network (${chainId})`;
  };

  const handleConnectWallet = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    try {
      const { provider, signer } = await getProviderAndSigner();
      
      if (signer) {
        const address = await signer.getAddress();
        setWalletAddress(address);
        setIsConnected(true);
        
        // Get network information
        const network = await provider?.getNetwork();
        if (network) {
          const networkName = getNetworkName(network.chainId);
          setNetworkInfo({ name: networkName, chainId: network.chainId });
          console.log(`Connected to network: ${networkName} (Chain ID: ${network.chainId})`);
        }
        
        console.log('Connected to wallet:', address);
      } else {
        console.error('Failed to get signer');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    setIsConnected(false);
    setWalletAddress('');
    setNetworkInfo(null);
    console.log('Disconnected from wallet');
  };

  const handleNetworkSwitch = async (chainId: number) => {
    if (!window.ethereum) {
      alert('MetaMask is not installed!');
      return;
    }

    const networkData = networks.find(n => n.chainId === chainId);
    if (!networkData) {
      console.error(`Network data not found for chain ID ${chainId}`);
      return;
    }

    // For Hardhat, let's first check what chain ID the RPC actually returns
    if (chainId === 1337) {
      try {
        console.log("Checking actual chain ID from RPC...");
        const provider = new ((window as unknown) as { ethers: { providers: { JsonRpcProvider: new (url: string) => any } } }).ethers.providers.JsonRpcProvider(networkData.rpcUrl);
        const network = await provider.getNetwork();
        console.log(`RPC endpoint returned chain ID: ${network.chainId}`);
        
        // If the RPC returns a different chain ID, update our network data
        if (network.chainId !== chainId) {
          console.log(`Updating chain ID from ${chainId} to ${network.chainId}`);
          chainId = network.chainId;
        }
      } catch (error) {
        console.error("Error checking RPC chain ID:", error);
      }
    }

    try {
      // Convert chainId to hex
      const chainIdHex = `0x${chainId.toString(16)}`;
      
      console.log(`Attempting to switch to ${networkData.name} (${chainIdHex})`);
      
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      console.log(`Successfully switched to ${networkData.name}`);
      setIsNetworkDropdownOpen(false);
    } catch (switchError: unknown) {
      console.log('Switch error:', switchError);
      
      // Type guard to check if switchError has code property
      if (
        typeof switchError === 'object' && 
        switchError !== null && 
        ('code' in switchError || 'message' in switchError)
      ) {
        const error = switchError as { code?: number; message?: string };
        
        if (error.code === 4902 || chainId === 1337 || (error.message && error.message.includes('Unrecognized chain ID'))) {
          try {
            console.log(`Adding network: ${networkData.name} (${chainId})`);
            
            const chainIdHex = `0x${chainId.toString(16)}`;
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: chainIdHex,
                  chainName: networkData.name,
                  rpcUrls: [networkData.rpcUrl],
                  nativeCurrency: networkData.nativeCurrency,
                  blockExplorerUrls: networkData.blockExplorerUrl ? [networkData.blockExplorerUrl] : undefined,
                },
              ],
            });
            
            console.log(`Network added: ${networkData.name}`);
            
            // After adding, try switching again for Hardhat
            if (chainId === 1337) {
              setTimeout(async () => {
                try {
                  await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: chainIdHex }],
                  });
                  console.log(`Successfully switched to ${networkData.name}`);
                } catch (error) {
                  console.error('Error switching after adding network:', error);
                }
              }, 1000);
            }
            
            setIsNetworkDropdownOpen(false);
          } catch (addError) {
            console.error('Error adding network:', addError);
          }
        } else {
          console.error('Error switching network:', error);
        }
      }
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <nav className="fixed top-0 right-0 p-4 z-50">
      {isConnected ? (
        <div className="flex items-center space-x-4">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
              className="bg-gradient-to-r from-blue-500 to-teal-400 text-white py-2 px-4 rounded-lg shadow-md font-medium flex items-center"
            >
              <div className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
              <span>{networkInfo?.name || 'Unknown Network'}</span>
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isNetworkDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {networks.map((network) => (
                    <button
                      key={network.chainId}
                      onClick={() => handleNetworkSwitch(network.chainId)}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        networkInfo?.chainId === network.chainId
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      role="menuitem"
                    >
                      {network.name}
                      {networkInfo?.chainId === network.chainId && (
                        <span className="ml-2 text-green-500">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div onClick={handleDisconnectWallet} className="flex flex-col items-end">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-2 px-4 rounded-lg shadow-md font-medium flex items-center cursor-pointer hover:shadow-lg transition-all">
              <div className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse"></div>
              <span>{formatAddress(walletAddress)}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Link href="/profile">
              <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-md">
                Profile
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <button 
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className={`bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium py-2 px-6 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${isConnecting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}
    </nav>
  );
};

export default Navbar; 