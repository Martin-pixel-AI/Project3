"use client";

import React, { useState } from 'react';

interface PromoCodeFormProps {
  onSubmit: (code: string) => Promise<void>;
  courseId?: string;
}

const PromoCodeForm: React.FC<PromoCodeFormProps> = ({ onSubmit, courseId }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!code.trim()) {
      setError('Please enter a promo code');
      return;
    }
    
    setLoading(true);
    
    try {
      await onSubmit(code);
      setCode('');
      setSuccess('Promo code activated successfully!');
    } catch (err) {
      console.error('PromoCodeForm error:', err);
      let errorMessage = 'Failed to activate promo code';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as any).message);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-background-light p-6 rounded-lg shadow-md animate-fade-in">
      <h3 className="text-xl font-semibold mb-4">
        {courseId ? 'Unlock This Course' : 'Activate Promo Code'}
      </h3>
      
      <p className="text-text-secondary mb-4">
        {courseId
          ? 'Enter your promo code to get access to this course.'
          : 'Enter a promo code to unlock premium courses.'}
      </p>
      
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
          <label htmlFor="promoCode" className="block text-sm font-medium mb-1">
            Promo Code
          </label>
          <input
            id="promoCode"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input"
            placeholder="Enter your code here"
            required
          />
        </div>
        
        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Activate Code'}
        </button>
      </form>
    </div>
  );
};

export default PromoCodeForm; 