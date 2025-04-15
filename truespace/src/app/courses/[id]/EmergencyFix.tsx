import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface EmergencyFixProps {
  courseId: string;
  token: string;
}

export default function EmergencyFix({ courseId, token }: EmergencyFixProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fixPromoCode = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log('Attempting emergency promo fix for course:', courseId);
      
      const response = await fetch('/api/emergency/promo-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId, promoCode: 'deva' }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        console.log('Emergency promo fix result:', data);
        
        if (data.verification?.shouldHaveAccess) {
          alert('Access has been fixed! Refreshing the page...');
          // Hard refresh the page to reload everything
          window.location.href = window.location.href;
        } else {
          alert('Fix applied but verification failed. Please check the console for details.');
        }
      } else {
        setError(data.error || 'Failed to apply emergency fix');
      }
    } catch (err) {
      console.error('Error applying emergency fix:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const applyDirectAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      console.log('Attempting direct emergency access for course:', courseId);
      
      const response = await fetch('/api/emergency/direct-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResult(data);
        console.log('Direct access result:', data);
        
        if (data.directAccessToken) {
          // Store the token in localStorage as a last resort
          localStorage.setItem('directAccessToken', data.directAccessToken);
          localStorage.setItem('directAccessCourse', courseId);
          
          alert('Direct access granted! Refreshing the page...');
          // Hard refresh the page to reload everything
          window.location.href = window.location.href;
        } else {
          alert('Direct access applied but no token was returned. Please check the console for details.');
        }
      } else {
        setError(data.error || 'Failed to apply direct access');
      }
    } catch (err) {
      console.error('Error applying direct access:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 p-4 border border-orange-300 rounded-md bg-orange-50 dark:bg-orange-900/30 dark:border-orange-800">
      <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
        Still having trouble accessing this course?
      </h3>
      
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          onClick={fixPromoCode}
          disabled={loading}
          className="px-3 py-2 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Working...' : 'Fix Promo Code'}
        </button>
        
        <button
          onClick={applyDirectAccess}
          disabled={loading}
          className="px-3 py-2 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Working...' : 'Emergency Direct Access'}
        </button>
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-600 dark:text-red-400">
          Error: {error}
        </div>
      )}
      
      {result && result.fixes && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          {result.fixes.map((fix: string, i: number) => (
            <div key={i}>✓ {fix}</div>
          ))}
        </div>
      )}
    </div>
  );
} 