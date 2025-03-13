# Monad Testnet Deployment Guide

This guide will walk you through deploying the Bonding Curve contracts to Monad Testnet.

## Prerequisites

1. Make sure you have Node.js and npm installed
2. Install dependencies: `npm install`
3. Create a `.env` file with your private key (see below)
4. Make sure you have MON tokens in your wallet for gas fees

## Setting Up Your Environment

1. Create a `.env` file in the root of the `bonding-curve` directory with the following content:

```
# Your private key (keep this secret and never commit to version control)
# This should be the private key of your Monad Testnet wallet
# Format: without 0x prefix, e.g., 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

2. Get MON tokens for Monad Testnet:
   - Visit the [Monad Faucet](https://faucet.monad.xyz/)
   - Enter your wallet address
   - Request MON tokens

## Deploying the Contracts

1. Run the deployment script:

```bash
npx hardhat run scripts/deploy-monad.js --network monadTestnet
```

2. The script will output the addresses of your deployed contracts. Save these addresses, especially the BondingCurveFactory address.

3. Update the frontend configuration with the deployed factory address using the provided script:

```bash
node scripts/update-frontend-config.js YOUR_FACTORY_ADDRESS
```

Alternatively, you can manually update the frontend configuration:
   - Open `/frontend-app/src/utils/config.ts`
   - Update the `factoryAddress` in the `testnet` section with your deployed factory address

## Verifying the Contracts

The deployment script will attempt to verify your contracts automatically. If verification fails, you can manually verify them:

```bash
npx hardhat verify --network monadTestnet YOUR_FACTORY_ADDRESS
```

## Running the Frontend

1. Make sure the frontend configuration is updated with the correct contract addresses
2. Start the frontend application:

```bash
cd ../frontend-app
npm run dev
```

3. Connect your wallet to Monad Testnet in MetaMask:
   - Network Name: MONAD Testnet
   - RPC URL: https://testnet-rpc2.monad.xyz/52227f026fa8fac9e2014c58fbf5643369b3bfc6
   - Chain ID: 10143
   - Currency Symbol: MON
   - Block Explorer URL: https://testnet.monadexplorer.com/

## Testing the Deployment

The deployment script automatically creates a test token. You can interact with this token through the frontend application:

1. Connect your wallet to the frontend application
2. Navigate to the token details page
3. Try buying and selling tokens
4. If you're the owner, you can also test the migration functionality

## Troubleshooting

- If you encounter errors during deployment, make sure:
  - Your private key is correct
  - You have enough MON tokens for gas
  - The RPC URL is working

- If contract verification fails:
  - Wait a few minutes and try again
  - Check that the contract is deployed successfully
  - Ensure you're using the correct contract address

- If the frontend can't connect to the contracts:
  - Check that the contract addresses in the config file are correct
  - Make sure you're connected to Monad Testnet in MetaMask
  - Check the browser console for any errors 