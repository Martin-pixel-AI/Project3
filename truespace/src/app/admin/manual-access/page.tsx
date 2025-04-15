"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/navigation/Navbar';

export default function ManualAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [courseId, setCourseId] = useState('');
  const [promoCode, setPromoCode] = useState('');
  
  // Result state
  const [result, setResult] = useState<any>(null);
  
  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth');
          return;
        }
        
        const response = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to get user info');
        }
        
        const userData = await response.json();
        if (userData.type !== 'admin') {
          setError('Only administrators can access this page');
          return;
        }
        
        setIsAdmin(true);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Authentication error');
      }
    };
    
    checkAdmin();
  }, [router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setResult(null);
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!courseId && !promoCode) {
      setError('Either Course ID or Promo Code is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
        return;
      }
      
      const response = await fetch('/api/admin/manual-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          courseId: courseId || undefined,
          promoCode: promoCode || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant access');
      }
      
      setSuccess('Access granted successfully!');
      setResult(data);
      
      // Clear form
      setCourseId('');
      setPromoCode('');
      
    } catch (err) {
      console.error('Error granting access:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error || 'Loading...'}
          </div>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Manual Access Grant Tool</h1>
        
        <div className="bg-background-light p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Grant Access to User</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 text-red-200 rounded-lg">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-900/30 text-green-200 rounded-lg">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                User Email (required)
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="user@example.com"
                required
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="courseId" className="block text-sm font-medium mb-1">
                Course ID
              </label>
              <input
                id="courseId"
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="input w-full"
                placeholder="e.g. 65a4f3c2b8f1d5e6c7b8a9f0"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="promoCode" className="block text-sm font-medium mb-1">
                Promo Code
              </label>
              <input
                id="promoCode"
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="input w-full"
                placeholder="e.g. SPRING2023"
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Grant Access'}
            </button>
          </form>
        </div>
        
        {result && (
          <div className="bg-background-light p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Result</h2>
            
            <div className="bg-background p-4 rounded-lg overflow-auto max-h-80">
              <pre className="text-sm text-text-secondary whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>
    </>
  );
} 