"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthMode = 'login' | 'register' | 'restore';

interface AuthFormProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ mode, onModeChange }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      if (mode === 'login') {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to login');
        }
        
        // Save token to localStorage
        localStorage.setItem('token', data.token);
        // Redirect to dashboard
        router.push('/courses');
        
      } else if (mode === 'register') {
        if (!name) {
          throw new Error('Name is required');
        }
        
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to register');
        }
        
        // Save token to localStorage
        localStorage.setItem('token', data.token);
        // Redirect to dashboard
        router.push('/courses');
        
      } else if (mode === 'restore') {
        const response = await fetch('/api/auth/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to send password reset');
        }
        
        setSuccess('If your email is registered, you will receive password reset instructions.');
        
        // If we have the temporary password (demo only), show it
        if (data.tempPassword) {
          setSuccess(`Your temporary password is: ${data.tempPassword}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md px-6 py-8 bg-background-light rounded-xl shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-center mb-6">
        {mode === 'login' ? 'Log In' : mode === 'register' ? 'Create Account' : 'Reset Password'}
      </h2>
      
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
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required={mode === 'register'}
            />
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            required
          />
        </div>
        
        {mode !== 'restore' && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required={mode === 'login' || mode === 'register'}
            />
          </div>
        )}
        
        <button 
          type="submit" 
          className="btn btn-primary w-full"
          disabled={loading}
        >
          {loading ? 'Processing...' : mode === 'login' ? 'Log In' : mode === 'register' ? 'Sign Up' : 'Reset Password'}
        </button>
      </form>
      
      <div className="mt-6 text-center text-sm text-text-secondary">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <button 
              onClick={() => onModeChange('register')} 
              className="text-primary hover:underline"
            >
              Sign Up
            </button>
            <div className="mt-2">
              <button 
                onClick={() => onModeChange('restore')} 
                className="text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          </>
        ) : mode === 'register' ? (
          <>
            Already have an account?{' '}
            <button 
              onClick={() => onModeChange('login')} 
              className="text-primary hover:underline"
            >
              Log In
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => onModeChange('login')} 
              className="text-primary hover:underline"
            >
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthForm;