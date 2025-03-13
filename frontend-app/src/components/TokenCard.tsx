'use client';

import Link from 'next/link';

interface TokenCardProps {
  id: string;
  name: string;
  marketCap: string;
  creationTime: string;
  description: string;
  imageUrl?: string; // Make optional
}

const TokenCard = ({ id, name, marketCap, creationTime, description }: TokenCardProps) => {
  // Generate a color based on the token name
  const getColorFromName = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const bgColor = getColorFromName(name);

  return (
    <Link href={`/token/${id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div 
          className="w-full h-40 flex items-center justify-center" 
          style={{ backgroundColor: bgColor }}
        >
          <div className="text-3xl font-bold text-white">
            {name.substring(0, 2).toUpperCase()}
          </div>
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">{name}</h3>
          
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
            <span>Market Cap: {marketCap} MON</span>
            <span>{creationTime}</span>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default TokenCard; 