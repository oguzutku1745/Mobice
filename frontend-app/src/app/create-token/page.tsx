'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { createToken } from '@/utils/blockchain';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';

export default function CreateTokenPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    logo: null as string | null,
  });

  const [logoInputType, setLogoInputType] = useState<'file' | 'url'>('url');
  const [logoUrl, setLogoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; tokenAddress: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    // Simulate uploading to a third-party service
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          // In a real app, you would upload the file to a service like IPFS or Cloudinary
          // and get back a URL. For now, we'll use the data URL as a placeholder.
          setFormData({
            ...formData,
            logo: event.target.result as string,
          });
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }, 1000); // Simulate a 1-second upload
  };

  const handleLogoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUrl(e.target.value);
  };

  const handleLogoUrlSubmit = () => {
    if (!logoUrl) return;
    
    setIsUploading(true);
    
    // Validate the URL
    try {
      const url = new URL(logoUrl);
      
      // Handle Imgur URLs specifically
      let processedUrl = logoUrl;
      
      // Check if it's an Imgur URL
      if (url.hostname === 'imgur.com' || url.hostname === 'www.imgur.com') {
        // If it's a gallery link (contains /a/ or /gallery/)
        if (url.pathname.includes('/a/') || url.pathname.includes('/gallery/')) {
          setError('Please use a direct Imgur image link (ending with .jpg, .png, etc.) instead of a gallery link');
          setIsUploading(false);
          return;
        }
        
        // If it's a direct image but missing the i. subdomain and file extension
        if (!url.hostname.startsWith('i.') && !url.pathname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          // Convert to a direct image URL format
          const imgurId = url.pathname.split('/').pop();
          processedUrl = `https://i.imgur.com/${imgurId}.jpg`;
        }
      }
      
      setFormData({
        ...formData,
        logo: processedUrl,
      });
      setIsUploading(false);
    } catch (e) {
      setError('Please enter a valid URL');
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setError(null);
    setSuccess(null);
    
    // Validate form
    if (!formData.name || !formData.symbol || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Get logo URL (either from file upload or direct URL input)
    const imageUrl = logoInputType === 'url' ? logoUrl : (formData.logo || '');
    
    if (!imageUrl) {
      setError('Please provide a logo image URL');
      return;
    }
    
    setIsCreating(true);
    
    try {
      // Call the createToken function from our blockchain utilities
      const result = await createToken(
        formData.name,
        formData.symbol,
        formData.description,
        imageUrl
      );
      
      // Extract token address from transaction logs
      let tokenAddress = '';
      if (result && result.logs && result.logs.length > 0) {
        // The BondingCurveCreated event should be in the logs
        // The token address is typically in the second topic (index 1)
        const creationEvent = result.logs.find((log: any) => 
          log.topics && log.topics[0] === ethers.utils.id("BondingCurveCreated(address,address,string,string)")
        );
        
        if (creationEvent && creationEvent.args) {
          tokenAddress = creationEvent.args[1];
        }
      }
      
      setSuccess({
        message: `Token created successfully! Transaction hash: ${result.transactionHash}`,
        tokenAddress: tokenAddress
      });
      
      // Reset form after successful creation
      setFormData({
        name: '',
        symbol: '',
        description: '',
        logo: null,
      });
      setLogoUrl('');
      
      // Redirect to the token page after a short delay
      if (tokenAddress) {
        setTimeout(() => {
          router.push(`/token/${tokenAddress}`);
        }, 3000);
      }
      
    } catch (err: any) {
      setError(err.message || 'Failed to create token');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Create a Bonding Curve Token</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Success! </strong>
            <span className="block sm:inline">{success.message}</span>
            {success.tokenAddress && (
              <div className="mt-2">
                <Link href={`/token/${success.tokenAddress}`} className="text-green-600 hover:text-green-800 font-medium">
                  View your token →
                </Link>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6  text-gray-900 dark:text-black">
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Token Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="e.g., Monad Token"
              required
            />
          </div>
          
          <div className="mb-6 text-gray-900 dark:text-black">
            <label htmlFor="symbol" className="block text-sm font-medium mb-2">
              Token Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="e.g., MND"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Usually 3-4 characters (e.g., BTC, ETH, USDT)
            </p>
          </div>
          
          <div className="mb-6 text-gray-900 dark:text-black">
            <label htmlFor="description" className="block text-sm font-medium mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
              placeholder="Describe your token..."
              required
            />
          </div>
          
          <div className="mb-8 text-gray-900 dark:text-black">
            <label className="block text-sm font-medium mb-2">
              Token Logo <span className="text-red-500">*</span>
            </label>
            
            <div className="flex space-x-4 mb-4">
              <button
                type="button"
                onClick={() => setLogoInputType('file')}
                className={`px-3 py-1 rounded-md ${
                  logoInputType === 'file' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setLogoInputType('url')}
                className={`px-3 py-1 rounded-md ${
                  logoInputType === 'url' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                Provide URL
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                {formData.logo ? (
                  <Image src={formData.logo} alt="Token logo" width={64} height={64} />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </div>
              
              {logoInputType === 'file' ? (
                <div className="flex-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isUploading}
                  >
                    {isUploading ? 'Uploading...' : 'Choose File'}
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex">
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={handleLogoUrlChange}
                      placeholder="Enter image URL"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700"
                    />
                    <button
                      type="button"
                      onClick={handleLogoUrlSubmit}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isUploading || !logoUrl}
                    >
                      {isUploading ? 'Validating...' : 'Use URL'}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    For Imgur: Use direct image links (i.imgur.com/IMAGEID.jpg) instead of gallery links (imgur.com/a/...)
                  </p>
                </div>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Recommended: Square image, at least 200x200 pixels
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold mb-2 text-blue-800 dark:text-blue-200">About Bonding Curve Tokens</h3>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Bonding curve tokens use an automated market maker mechanism where the price increases as more tokens are purchased.
              When you create a token, you'll be the owner and can migrate it to a liquidity pool once it reaches sufficient adoption.
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={isCreating}
            >
              {isCreating ? 'Creating Token...' : 'Create Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 