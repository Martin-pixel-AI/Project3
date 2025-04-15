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
    
    if (!courseId) {
      setError('Error: No course ID provided. Please try reloading the page.');
      console.error('PromoCodeForm error: No courseId provided');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log(`Submitting promo code ${code} for course ${courseId || 'N/A'}`);
      
      // Store the code in localStorage for debugging purposes
      localStorage.setItem('lastPromoCode', code);
      localStorage.setItem('lastPromoCodeCourse', courseId);
      
      // Attempt activation
      await onSubmit(code);
      
      // Activation succeeded
      setCode('');
      setSuccess('Promo code activated successfully! Loading course content...');
      
    } catch (err) {
      console.error('PromoCodeForm error:', err);
      
      // Get the error message
      let errorMessage = 'Failed to activate promo code';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as any).message);
      }
      
      // Try to improve the error message for better user experience
      if (errorMessage.includes('already activated')) {
        errorMessage = 'You have already activated this promo code. The page will reload to try to access the course.';
        // Reload after showing error
        setTimeout(() => window.location.reload(), 3000);
      }
      else if (errorMessage.includes('not valid for this course')) {
        errorMessage = 'This promo code cannot be used for this course. Please check if you have the correct code.';
      }
      else if (errorMessage.includes('expired')) {
        errorMessage = 'This promo code has expired. Please contact support for assistance.';
      }
      else if (errorMessage.includes('reached maximum uses')) {
        errorMessage = 'This promo code has reached its maximum number of uses. Please contact support for assistance.';
      }
      else if (errorMessage.includes('Network error')) {
        errorMessage = 'Connection problem. Please check your internet connection and try again.';
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