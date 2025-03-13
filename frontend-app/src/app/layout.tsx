'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useState } from "react";
import { ThemeProvider } from "@/context/ThemeContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <html lang="en">
      <head>
        <title>Monad Blockchain App</title>
        <meta name="description" content="A blockchain application built on Monad" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
          <Navbar />
          
          {/* Menu toggle button - positioned in the middle of the left side */}
          <button
            onClick={toggleSidebar}
            className={`fixed top-1/2 transform -translate-y-1/2 z-50 p-2 bg-indigo-600 text-white rounded-r-md hover:bg-indigo-700 transition-all duration-300 ease-in-out ${
              isSidebarOpen ? 'left-64' : 'left-0'
            }`}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isSidebarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
          
          <div className={`transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'} min-h-screen flex flex-col`}>
            <main className="flex-grow pt-16 pb-8 bg-gradient">
              <div className="shadow-element"></div>
              <div className="shadow-element-2"></div>
              {children}
            </main>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
