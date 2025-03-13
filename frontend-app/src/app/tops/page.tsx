'use client';

import { useState, useEffect } from 'react';
import TokenCard from "@/components/TokenCard";
import { getAllTokens, formatCreationTime, TokenData } from '@/utils/tokenUtils';

type SortCriteria = 'marketCap' | 'volume' | 'priceChange' | 'migrated';

export default function TopsPage() {
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('marketCap');
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      const allTokens = await getAllTokens();
      setTokens(allTokens);
      setError(null);
    } catch (err) {
      console.error("Error fetching tokens:", err);
      setError("Failed to load tokens. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTokens();
  };

  const handleSort = (criteria: SortCriteria) => {
    setSortCriteria(criteria);
  };

  // Filter and sort tokens based on the selected criteria
  const getSortedTokens = () => {
    if (tokens.length === 0) return [];

    // For migrated filter, only show migrated tokens
    if (sortCriteria === 'migrated') {
      return tokens.filter(token => token.migrated === true)
        .sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap));
    }

    // For other criteria, sort accordingly
    return [...tokens].sort((a, b) => {
      if (sortCriteria === 'marketCap') {
        return parseFloat(b.marketCap) - parseFloat(a.marketCap);
      } else if (sortCriteria === 'volume') {
        // Since we don't have volume data yet, fallback to market cap
        return parseFloat(b.marketCap) - parseFloat(a.marketCap);
      } else {
        // For priceChange, we don't have this data yet, so fallback to creation time (newest first)
        return b.creationTime - a.creationTime;
      }
    });
  };

  const sortedTokens = getSortedTokens();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Top Tokens</h1>
        <button 
          onClick={handleRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Refreshing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>
      
      <div className="mb-8">
        <div className="flex flex-wrap space-x-2 space-y-2 sm:space-y-0 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'marketCap' 
                ? 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-black' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('marketCap')}
          >
            Market Cap
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'volume' 
                ? 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-black' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('volume')}
          >
            Volume
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'priceChange' 
                ? 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-black' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('priceChange')}
          >
            Price Change
          </button>
          <button 
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortCriteria === 'migrated' 
                ? 'bg-indigo-600 text-white dark:bg-indigo-600 dark:text-black' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
            onClick={() => handleSort('migrated')}
          >
            Migrated
          </button>
        </div>
        
        {loading && !refreshing ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        ) : sortedTokens.length === 0 ? (
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-400">
              {sortCriteria === 'migrated' 
                ? 'No migrated tokens available yet.' 
                : 'No tokens available. Connect your wallet to see tokens.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedTokens.map((token) => (
              <TokenCard 
                key={token.id} 
                id={token.id}
                name={token.name}
                marketCap={token.marketCap}
                creationTime={formatCreationTime(token.creationTime)}
                description={token.description}
                imageUrl={token.imageUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}