"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navigation/Navbar';
import Loader from '../../components/ui/Loader';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check admin auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Redirect to login if not logged in
          router.push('/auth');
          return;
        }
        
        // TODO: Add proper admin auth check
        // For now, just simulate a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // For the placeholder, just show admin panel to anyone with a token
        
      } catch (err) {
        console.error('Error checking admin auth:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);
  
  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center py-16">
            <Loader size="large" />
          </div>
        </main>
      </>
    );
  }
  
  if (error) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error}
          </div>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        
        <div className="bg-background-light p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Admin Panel</h2>
          <p className="text-text-secondary mb-6">
            This is a placeholder for the admin panel. In a production version, this would include:
          </p>
          
          <ul className="list-disc pl-5 space-y-2 text-text-secondary">
            <li>Course management (create, edit, delete)</li>
            <li>Video management</li>
            <li>User management</li>
            <li>Promo code generation and tracking</li>
            <li>Analytics and statistics</li>
          </ul>
          
          <div className="mt-8 p-4 bg-primary/10 rounded-lg border border-primary">
            <p className="text-sm">
              <strong>Note:</strong> This is a demo project. The complete admin panel would require additional development time.
            </p>
          </div>
        </div>
      </main>
    </>
  );
} 