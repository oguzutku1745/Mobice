# Monad Bonding Curve Exchange

A decentralized platform for creating, buying, and selling tokens using bonding curve mechanics on the Monad blockchain.

## Overview

This platform enables users to create and trade tokens using a bonding curve mechanism, which automatically determines token prices based on the token supply. The platform also supports migration to Uniswap liquidity pools, allowing tokens to transition from bonding curve pricing to market-based pricing.

### Key Features

- **Token Creation**: Create custom tokens with name, symbol, description, and logo
- **Bonding Curve Trading**: Buy and sell tokens with algorithmically determined prices
- **Token Migration**: Migrate tokens to Uniswap liquidity pools
- **User Profiles**: View created tokens and token holdings
- **Token Details**: Explore token information, market cap, and trading history

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MetaMask or another Ethereum wallet
- Access to Monad Testnet (for testnet deployment)

### Installation and Setup

#### Smart Contracts

1. Clone the repository:
   ```bash
   git clone https://github.com/oguzutku1745/Mobice
   cd Mobice
   ```

2. Install dependencies:
   ```bash
   cd bonding-curve
   npm install
   ```

3. Create a `.env` file with your private key (for deployment):
   ```
   PRIVATE_KEY=your_private_key_here_without_0x_prefix
   ```

4. Compile the contracts:
   ```bash
   npx hardhat compile
   ```

5. Run tests:
   ```bash
   npx hardhat test
   ```

6. Deploy to local network:
   ```bash
   npx hardhat node
   npx hardhat run scripts/deploy.js --network localhost
   ```

7. Deploy to Monad Testnet:
   ```bash
   npx hardhat run scripts/deploy-monad.js --network monadTestnet
   ```

#### Frontend Application

1. Install dependencies:
   ```bash
   cd ../frontend-app
   npm install
   ```

2. Update the configuration (if needed):
   - Edit `src/utils/config.ts` to point to your deployed contracts

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   npm run start
   ```

### Connecting to Monad Testnet

To connect MetaMask to Monad Testnet:

1. Open MetaMask and click on the network dropdown
2. Select "Add Network"
3. Enter the following details:
   - Network Name: MONAD Testnet
   - RPC URL: <Testnet URL>
   - Chain ID: 10143
   - Currency Symbol: MON
   - Block Explorer URL: https://testnet.monadexplorer.com/

4. Get testnet MON from the [Monad Faucet](https://testnet.monad.xyz/)

## Technical Architecture

### Project Structure

The project is organized into two main components:

```
monad/
├── bonding-curve/       # Smart contracts and blockchain logic
└── frontend-app/        # Next.js frontend application
```

### Smart Contracts (bonding-curve/)

The smart contract architecture implements a bonding curve token system with the following components:

#### BondingCurveFactory

The factory contract is responsible for creating and managing bonding curve tokens. It serves as the central registry for all tokens created on the platform.

Key functionalities:
- Creates new bonding curve tokens with custom parameters
- Tracks all tokens and their metadata
- Records trades and migrations
- Provides query functions for token discovery
- Maintains market cap data for all tokens

#### BondingCurve

The core token contract that implements both ERC20 functionality and bonding curve mechanics.

Key functionalities:
- Standard ERC20 token functionality
- Implements a constant product (x*y=k) bonding curve
- Handles buy and sell operations with dynamic pricing
- Manages token metadata (name, symbol, description, logo)
- Provides migration functionality to Uniswap

### Bonding Curve Mechanics

The platform implements a constant product bonding curve using the formula:

```
virtualTokens * virtualETH = k (constant)
```

This creates a price curve where:
- As tokens are purchased, the price increases
- As tokens are sold, the price decreases
- The price is determined by the ratio of virtualETH / virtualTokens

Key parameters:
- **Initial Virtual Tokens**: 1,073,000,000 tokens
- **Initial Virtual ETH**: 40.25 ETH
- **Initial Price**: 0.0000000025 ETH per token
- **Target Price**: 0.0000000375 ETH per token
- **Migration Threshold**: 80% (migration can be triggered when 80% of tokens are sold)

#### Price Calculation

The price for buying or selling tokens is calculated using the constant product formula:

```solidity
function getPrice(uint256 tokenAmount) public view returns (uint256) {
    require(tokenAmount < virtualTokens, "Not enough virtual tokens left");
    
    uint256 newVirtualTokens = virtualTokens - tokenAmount;
    uint256 newVirtualETH = k / newVirtualTokens;
    return newVirtualETH - virtualETH; // Returns ETH required for `tokenAmount`
}
```

#### Buy/Sell Mechanism

When a user buys tokens:
1. The price is calculated based on the amount of tokens requested
2. The user sends ETH to cover the cost
3. The tokens are transferred from the owner to the buyer
4. The virtual token and ETH values are updated to maintain the constant k

When a user sells tokens:
1. The price is calculated based on the amount of tokens being sold
2. The tokens are transferred from the seller to the owner
3. ETH is sent to the seller
4. The virtual token and ETH values are updated to maintain the constant k

#### Migration to Uniswap

When the token reaches the migration threshold (80% of tokens sold), the owner can trigger migration:
1. A fee (3.5%) is calculated from the collected ETH
2. The remaining ETH and tokens are used to create a Uniswap liquidity pool
3. The bonding curve is marked as migrated, preventing further buys
4. Trading continues on Uniswap with market-based pricing

### Frontend Application (frontend-app/)

The frontend is built with Next.js and integrates with the Monad blockchain using ethers.js and wagmi.

#### Technology Stack

- **Framework**: Next.js 14 with App Router
- **UI Components**: Tailwind CSS and shadcn/ui
- **Blockchain Interaction**: ethers.js, wagmi, and viem

#### Key Components

- **Token Creation Page**: Form for creating new tokens
- **Token Details Page**: Comprehensive view of token information and trading interface
- **Profile Page**: User-specific information including created tokens and holdings
- **Home Page**: Discovery of available tokens and platform information

## Technical Implementation Details

### Smart Contract Implementation

The bonding curve implementation follows a constant product model where:

```
k = virtualTokens * virtualETH
```

This creates a dynamic relationship between token supply and price, ensuring liquidity and price discovery.

Key smart contract features:

1. **Token Creation**: Factory contract deploys new token contracts with custom parameters
2. **Buy/Sell Mechanics**: 
   - Buy: Send ETH, receive tokens based on the bonding curve
   - Sell: Send tokens, receive ETH based on the bonding curve
3. **Migration**: Convert bonding curve tokens to standard ERC20 tokens in a Uniswap pool

### Frontend Implementation

The frontend application is built with a focus on user experience and performance:

1. **Server Components**: Leveraging Next.js server components for improved performance
2. **Responsive Design**: Mobile-first approach with Tailwind CSS
3. **Real-time State Management**: React states are used for immediate price and transaction updates

### Blockchain Integration

The application integrates with the Monad blockchain through:

1. **Provider Management**: Dynamic provider selection based on network configuration and custom connection component
2. **Transaction Handling**: Comprehensive transaction flow with confirmation and error handling
3. **Event Listening**: Real-time updates based on blockchain events
4. **Gas Optimization**: Efficient transaction batching and gas estimation

## Development and Deployment

### Local Development

The project supports local development using Hardhat for blockchain simulation:

For local development, frontend-app's `useLocalNetwork` parameter should be set to true.

1. **Smart Contracts**: Local deployment and testing with Hardhat
2. **Frontend**: Development server with hot reloading
3. **Integration**: Fast connection between frontend and local blockchain

### Monad Testnet Deployment

The application is deployed to the Monad Testnet with:

1. **Smart Contracts**: Deployed on Monad Testnet
2. **Frontend**: Configured to connect to Monad Testnet

## Technical Challenges and Solutions

### Challenge 1: Bonding Curve Implementation

**Problem**: Implementing a fair and efficient bonding curve mechanism.

**Solution**: Adopted a constant product bonding curve with carefully calibrated parameters to ensure fair pricing and prevent manipulation.

### Challenge 2: Token Migration

**Problem**: Seamlessly transitioning from bonding curve to Uniswap liquidity.

**Solution**: Implemented a two-step migration process that preserves token value and ensures liquidity.


### Challenge 3: User Experience

**Problem**: Creating an intuitive interface for complex DeFi operations.

**Solution**: Designed a step-by-step process with clear feedbacks, routings and comprehensive error handling with simple UI.

## Future Enhancements

### 1. UI/UX Improvements
- Enhanced visual design with more intuitive user flows
- Interactive charts for price history and market cap trends
- Mobile-responsive design optimizations
- Dark mode support
- Guided tutorials for new users

### 2. Wallet Integration Enhancements
- Support for multiple wallet types beyond MetaMask
- Integration with Web3Modal for a unified wallet connection experience
- Social login options with wallet abstraction
- Better error handling for wallet connection issues
- Session persistence for improved user experience

### 3. Decentralized Migration
- Allow any user (not just the owner) to trigger migration when threshold is reached
- Incentives for users who trigger migration
- Partial migrations with gradual liquidity transfer

### 4. Mint/Burn Mechanism
- Replace the current owner-mediated buy/sell mechanism with direct mint/burn
- Eliminate the need for the owner to hold all tokens
- More gas-efficient token transfers
- Truly trustless trading without reliance on the token creator
- Automatic liquidity provision with each transaction

### 5. Trading Terminal
- Advanced trading interface
- Trading history and portfolio analytics

### 6. Additional Enhancements
- **Advanced Bonding Curves**: Support for different curve types (exponential, logarithmic)
- **Multi-chain Support**: Expansion to additional EVM-compatible blockchains
- **Mobile Application**: Native mobile experience for on-the-go trading

## Deployed Contracts

The following contracts have been deployed to the Monad Testnet:

| Contract | Address |
|----------|---------|
| BondingCurveFactory | 0xDf9c90f40819cd3E5941d148b88bf47aCcacBf06 |
| Test Token (MTT) | 0xdD0Eb5D4C3A505d28eA59d55b1d75B994D195Db2 |
| UniswapV2Router02 (existing) | 0xfb8e1c3b833f9e67a71c859a132cf783b645e436 |

## License

This project is licensed under the MIT License - see the LICENSE file for details. 