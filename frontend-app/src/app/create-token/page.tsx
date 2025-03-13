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
        <Link href="/" className="text-blue-500 hover:underline dark:text-blue-400">
          ← Back to Home
        </Link>
      </div>
      
      <h1 className="text-3xl font-bold mb-8 text-heading">Create a Bonding Curve Token</h1>
      
      <div className="bg-card rounded-lg shadow-md p-6 max-w-2xl mx-auto">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-200 px-4 py-3 rounded relative">
            <strong className="font-bold">Success! </strong>
            <span className="block sm:inline">{success.message}</span>
            {success.tokenAddress && (
              <div className="mt-2">
                <Link href={`/token/${success.tokenAddress}`} className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium">
                  View your token →
                </Link>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium mb-2 text-heading">
              Token Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-card-text"
              placeholder="e.g., Monad Token"
              required
            />
          </div>
          
          <div className="mb-6">
            <label htmlFor="symbol" className="block text-sm font-medium mb-2 text-heading">
              Token Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-card-text"
              placeholder="e.g., MND"
              required
            />
            <p className="mt-1 text-sm text-secondary">
              Usually 3-4 characters (e.g., BTC, ETH, USDT)
            </p>
          </div>
          
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium mb-2 text-heading">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-card-text"
              rows={4}
              placeholder="Describe your token and its purpose..."
              required
            ></textarea>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-heading">
              Token Logo <span className="text-red-500">*</span>
            </label>
            
            <div className="flex space-x-4 mb-4">
              <button
                type="button"
                onClick={() => setLogoInputType('url')}
                className={`px-4 py-2 rounded-lg ${
                  logoInputType === 'url'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-highlight text-card-text'
                }`}
              >
                Use URL
              </button>
              <button
                type="button"
                onClick={() => setLogoInputType('file')}
                className={`px-4 py-2 rounded-lg ${
                  logoInputType === 'file'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-highlight text-card-text'
                }`}
              >
                Upload File
              </button>
            </div>
            
            {logoInputType === 'url' ? (
              <div>
                <div className="flex">
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={handleLogoUrlChange}
                    className="flex-1 px-4 py-2 border border-theme rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-card text-card-text"
                    placeholder="https://example.com/logo.png"
                  />
                  <button
                    type="button"
                    onClick={handleLogoUrlSubmit}
                    disabled={isUploading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-r-lg disabled:opacity-50"
                  >
                    {isUploading ? 'Loading...' : 'Use This URL'}
                  </button>
                </div>
                <p className="mt-1 text-sm text-secondary">
                  Provide a direct link to your logo image (PNG, JPG, or GIF)
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Choose File'}
                  </button>
                  <span className="ml-3 text-sm text-secondary">
                    {formData.logo ? 'File selected' : 'No file chosen'}
                  </span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <p className="mt-1 text-sm text-secondary">
                  Recommended: 200x200 pixels, PNG or JPG format
                </p>
              </div>
            )}
            
            {formData.logo && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2 text-heading">Preview:</p>
                <div className="w-20 h-20 rounded-full overflow-hidden border border-theme">
                  <img
                    src={formData.logo}
                    alt="Token logo preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-highlight p-4 rounded-lg mb-6">
            <h3 className="text-sm font-medium mb-2 text-heading">Important Information</h3>
            <ul className="list-disc list-inside text-sm text-card-text">
              <li>Your token will be created on the Monad Testnet.</li>
              <li>Initial token supply will be allocated to your wallet.</li>
              <li>The bonding curve uses a constant product formula (x*y=k).</li>
              <li>Once created, the token parameters cannot be changed.</li>
              <li>A small gas fee will be required to create your token.</li>
            </ul>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg shadow-md disabled:opacity-50"
            >
              {isCreating ? 'Creating Token...' : 'Create Token'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 