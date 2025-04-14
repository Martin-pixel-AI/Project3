"use client";

import { Metadata } from 'next';
import React, { useState } from 'react';
import Navbar from '../../components/navigation/Navbar';
import AuthForm from '../../components/auth/AuthForm';

type AuthMode = 'login' | 'register' | 'restore';

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  
  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-background">
        <div className="w-full max-w-md px-4">
          <AuthForm mode={mode} onModeChange={setMode} />
          
          <div className="mt-8 text-center text-text-secondary text-sm">
            <p>
              By signing up, you agree to our{' '}
              <a href="#" className="text-primary hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  );
} 