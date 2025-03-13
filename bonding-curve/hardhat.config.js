require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Load private key from .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337 // This makes it easier to connect from MetaMask
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337
    },
    monadTestnet: {
      url: "https://testnet-rpc2.monad.xyz/52227f026fa8fac9e2014c58fbf5643369b3bfc6",
      chainId: 10143,
      accounts: [`0x${PRIVATE_KEY}`],
      gasPrice: 50000000000, // 20 gwei
      gasMultiplier: 1.5,
      type: 0
    }
  },
  paths: {
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      monadTestnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet.monadexplorer.com/api",
          browserURL: "https://testnet.monadexplorer.com"
        }
      }
    ]
  }
};
