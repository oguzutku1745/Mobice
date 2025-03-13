'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar = ({ isOpen, toggleSidebar }: SidebarProps) => {
  const menuItems = [
    { name: 'Profile', path: '/profile' },
    { name: 'Tops', path: '/tops' },
    { name: 'Create a Token', path: '/create-token' },
  ];

  // Close sidebar when clicking escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        toggleSidebar();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, toggleSidebar]);

  return (
    <>
      {/* Semi-transparent overlay that dims the content when sidebar is open */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-300 ${
          isOpen ? 'opacity-30 z-30' : 'opacity-0 -z-10'
        }`}
        onClick={toggleSidebar}
      />
      
      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full bg-gray-900 text-white p-4 flex flex-col z-40 transition-all duration-300 ease-in-out shadow-lg ${
          isOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full'
        }`}
      >
        <div className="mb-8">
          <Link href="/" className="flex items-center justify-center">
            {/* Replace with your actual logo */}
            <div className="w-40 h-12 bg-indigo-600 flex items-center justify-center rounded-md">
              <span className="font-bold text-xl">MOBICE</span>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.path}
                  className="block py-2 px-4 rounded hover:bg-gray-800 transition-colors"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar; 