import { defineChain } from 'viem';

// Define the MONAD Testnet chain
export const monadTestnet = defineChain({
  id: 10143,
  name: "MONAD Testnet",
  network: "monad",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://testnet-rpc2.monad.xyz/52227f026fa8fac9e2014c58fbf5643369b3bfc6"] },
    public: { http: ["https://testnet-rpc2.monad.xyz/52227f026fa8fac9e2014c58fbf5643369b3bfc6"] }
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
  devnet: true
});

// Define the local Hardhat network
export const localHardhat = {
  id: 31337,
  name: "Hardhat Local",
  network: "hardhat",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["http://localhost:8545"] },
    public: { http: ["http://localhost:8545"] }
  }
};

// Environment configuration
export const config = {
  // Set to true to use local Hardhat network, false to use MONAD Testnet
  useLocalNetwork: false,
  
  // Contract addresses - update these after deployment
  contracts: {
    // Local network addresses
    local: {
      factoryAddress: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
      routerAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
    },
    // MONAD Testnet addresses (to be filled after deployment)
    testnet: {
      // REPLACE_WITH_DEPLOYED_FACTORY_ADDRESS - Update this after deployment
      factoryAddress: '0xDf9c90f40819cd3E5941d148b88bf47aCcacBf06',
      // Using the existing Uniswap V2 Router on Monad Testnet
      routerAddress: '0xfb8e1c3b833f9e67a71c859a132cf783b645e436'
    }
  },
  
  // Get the current network configuration
  getCurrentNetwork() {
    return this.useLocalNetwork ? localHardhat : monadTestnet;
  },
  
  // Get the current contract addresses
  getCurrentAddresses() {
    return this.useLocalNetwork ? this.contracts.local : this.contracts.testnet;
  }
};