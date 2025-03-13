'use client';

import { useState } from 'react';
import TokenCard from "@/components/TokenCard";

// Mock data for top tokens
const initialTopTokens = [
  {
    id: "1",
    name: "MonadCoin",
    marketCap: "$1.2M",
    marketCapValue: 1200000,
    volume: "$450K",
    volumeValue: 450000,
    priceChange: "+15%",
    priceChangeValue: 15,
    creationTime: "2 days ago",
    description: "The native token of the Monad ecosystem with high TPS and low fees.",
    imageUrl: "/images/token1.png",
  },
  {
    id: "2",
    name: "DeFiToken",
    marketCap: "$890K",
    marketCapValue: 890000,
    volume: "$320K",
    volumeValue: 320000,
    priceChange: "+8%",
    priceChangeValue: 8,
    creationTime: "5 days ago",
    description: "A decentralized finance token built on Monad blockchain.",
    imageUrl: "/images/token2.png",
  },
  {
    id: "3",
    name: "GameFi",
    marketCap: "$750K",
    marketCapValue: 750000,
    volume: "$280K",
    volumeValue: 280000,
    priceChange: "+12%",
    priceChangeValue: 12,
    creationTime: "1 week ago",
    description: "Gaming meets DeFi with this innovative token.",
    imageUrl: "/images/token3.png",
  },
  {
    id: "4",
    name: "NFTMarket",
    marketCap: "$650K",
    marketCapValue: 650000,
    volume: "$210K",
    volumeValue: 210000,
    priceChange: "+5%",
    priceChangeValue: 5,
    creationTime: "2 weeks ago",
    description: "The token powering the largest NFT marketplace on Monad.",
    imageUrl: "/images/token4.png",
  },
  {
    id: "5",
    name: "ArtistToken",
    marketCap: "$120K",
    marketCapValue: 120000,
    volume: "$85K",
    volumeValue: 85000,
    priceChange: "+20%",
    priceChangeValue: 20,
    creationTime: "12 hours ago",
    description: "Supporting digital artists through blockchain technology.",
    imageUrl: "/images/token5.png",
  },
  {
    id: "6",
    name: "SocialFi",
    marketCap: "$95K",
    marketCapValue: 95000,
    volume: "$65K",
    volumeValue: 65000,
    priceChange: "+18%",
    priceChangeValue: 18,
    creationTime: "18 hours ago",
    description: "Decentralized social media platform token.",
    imageUrl: "/images/token6.png",
  },
  {
    id: "7",
    name: "DataDAO",
    marketCap: "$85K",
    marketCapValue: 85000,
    volume: "$40K",
    volumeValue: 40000,
    priceChange: "+7%",
    priceChangeValue: 7,
    creationTime: "1 day ago",
    description: "Decentralized data marketplace and governance token.",
    imageUrl: "/images/token7.png",
  },
  {
    id: "8",
    name: "PrivacyCoin",
    marketCap: "$75K",
    marketCapValue: 75000,
    volume: "$30K",
    volumeValue: 30000,
    priceChange: "+3%",
    priceChangeValue: 3,
    creationTime: "1 day ago",
    description: "Enhanced privacy features for blockchain transactions.",
    imageUrl: "/images/token8.png",
  },
];

type SortCriteria = 'marketCap' | 'volume' | 'priceChange';

export default function TopsPage() {
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('marketCap');
  const [topTokens, setTopTokens] = useState(initialTopTokens);

  const handleSort = (criteria: SortCriteria) => {
    setSortCriteria(criteria);
    
    const sortedTokens = [...initialTopTokens].sort((a, b) => {
      if (criteria === 'marketCap') {
        return b.marketCapValue - a.marketCapValue;
      } else if (criteria === 'volume') {
        return b.volumeValue - a.volumeValue;
      } else {
        return b.priceChangeValue - a.priceChangeValue;
      }
    });
    
    setTopTokens(sortedTokens);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Top Tokens</h1>
      
      <div className="mb-8">
        <div className="flex space-x-4 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'marketCap' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('marketCap')}
          >
            Market Cap
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'volume' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('volume')}
          >
            Volume
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'priceChange' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('priceChange')}
          >
            Price Change
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topTokens.map((token) => (
            <TokenCard 
              key={token.id} 
              id={token.id}
              name={token.name}
              marketCap={token.marketCap}
              creationTime={token.creationTime}
              description={token.description}
              imageUrl={token.imageUrl}
            />
          ))}
        </div>
      </div>
    </div>
  );
}