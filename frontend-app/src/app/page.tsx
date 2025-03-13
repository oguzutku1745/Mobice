'use client';

import React from 'react';
import TokenCard from '@/components/TokenCard';
import { getTrendingTokens, getNewestTokens, TokenData, formatCreationTime } from '@/utils/tokenUtils';

// Client component to fetch and display tokens
import { useEffect, useState } from 'react';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 lg:p-12">
      <div className="w-full max-w-7xl mx-auto">
        <div className="relative mb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-2 bg-gradient-to-r from-indigo-600 via-blue-500 to-purple-600 bg-clip-text text-transparent drop-shadow-sm animated-gradient">
            Monad Bonding Curve Exchange
          </h1>
          <div className="h-1 w-48 md:w-64 mx-auto bg-gradient-to-r from-indigo-600 via-blue-500 to-purple-600 rounded-full animated-underline"></div>
          <p className="mt-4 text-secondary text-lg">Trade, create, and explore bonding curve tokens on Monad</p>
        </div>
        
        <div className="grid grid-cols-1 gap-8">
          {/* Trending Tokens Section */}
          <TrendingTokensSection />
          
          {/* New Drops Section */}
          <NewDropsSection />
        </div>
      </div>
    </main>
  );
}

// Client component for trending tokens
function TrendingTokensSection() {
  const [trendingTokens, setTrendingTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrendingTokens = async () => {
    try {
      setLoading(true);
      const tokens = await getTrendingTokens(5);
      console.log(tokens)
      setTrendingTokens(tokens);
      setError(null);
    } catch (err) {
      console.error("Error fetching trending tokens:", err);
      setError("Failed to load trending tokens. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTrendingTokens();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrendingTokens();
  };

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Trending Tokens</h2>
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
      
      {loading && !refreshing ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      ) : trendingTokens.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400">No trending tokens available. Connect your wallet to see tokens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingTokens.map((token) => (
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
    </section>
  );
}

// Client component for new drops
function NewDropsSection() {
  const [newDrops, setNewDrops] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNewDrops = async () => {
    try {
      setLoading(true);
      const tokens = await getNewestTokens(5);
      setNewDrops(tokens);
      setError(null);
    } catch (err) {
      console.error("Error fetching new drops:", err);
      setError("Failed to load new tokens. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNewDrops();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNewDrops();
  };

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Fresh Out of TPS</h2>
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
      
      {loading && !refreshing ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      ) : newDrops.length === 0 ? (
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400">No new tokens available. Connect your wallet to see tokens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newDrops.map((token) => (
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
    </section>
  );
}
