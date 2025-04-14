"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../components/navigation/Navbar';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [adminKey, setAdminKey] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, adminKey }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Не удалось зарегистрировать администратора');
      }
      
      // Сохраняем токен и перенаправляем на админ-панель
      localStorage.setItem('token', data.token);
      router.push('/admin');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-background-light p-8 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Регистрация Администратора</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 text-red-200 rounded-lg">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Имя
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Пароль
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="adminKey" className="block text-sm font-medium mb-1">
                Ключ администратора
              </label>
              <input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                className="input w-full"
                required
              />
              <p className="text-xs text-text-secondary mt-1">
                Необходим специальный ключ для регистрации аккаунта администратора.
              </p>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <button 
              onClick={() => router.push('/auth')}
              className="text-primary hover:underline"
            >
              Вернуться на страницу входа
            </button>
          </div>
        </div>
      </main>
    </>
  );
} 