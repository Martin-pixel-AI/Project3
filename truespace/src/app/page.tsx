"use client";

import React from 'react';
import Link from 'next/link';
import Navbar from '../components/navigation/Navbar';

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-secondary-light bg-clip-text text-transparent animate-fade-in">
            Welcome to Truespace
          </h1>
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8 animate-slide-up">
            Access premium educational content with promo codes. 
            Expand your knowledge with high-quality video courses.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/auth" className="btn btn-primary text-lg px-8 py-3">
              Get Started
            </Link>
            <Link href="/courses" className="btn btn-outline text-lg px-8 py-3">
              Browse Courses
            </Link>
          </div>
          
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-background-light p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Access Premium Content</h3>
              <p className="text-text-secondary">Unlock high-quality courses with promo codes from your educators.</p>
            </div>
            
            <div className="bg-background-light p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Learn at Your Pace</h3>
              <p className="text-text-secondary">Watch video tutorials on your schedule, from any device, anytime.</p>
            </div>
            
            <div className="bg-background-light p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Join the Community</h3>
              <p className="text-text-secondary">Connect with other learners and expand your professional network.</p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-background-light py-8">
        <div className="container mx-auto px-4 text-center text-text-secondary">
          <p>© {new Date().getFullYear()} Truespace. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
} 