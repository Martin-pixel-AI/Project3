"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navigation/Navbar';
import PromoCodeForm from '../../components/courses/PromoCodeForm';
import Loader from '../../components/ui/Loader';
import { UserIcon, KeyIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  promoCode?: string;
  favorites: any[];
  activatedCourses: any[];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Redirect to login if not logged in
          router.push('/auth');
          return;
        }
        
        const response = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        
        const data = await response.json();
        setUser(data.user);
        
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router]);
  
  // Handle promo code submission
  const handlePromoCodeSubmit = async (code: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/auth');
        return;
      }
      
      const response = await fetch('/api/promo/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to activate promo code');
      }
      
      // Refresh the page to show updated courses
      window.location.reload();
      
    } catch (err) {
      throw err;
    }
  };
  
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
  
  if (error || !user) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error || 'User data not available'}
          </div>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        {/* Tabs */}
        <div className="flex mb-6 border-b border-background-lighter">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            <UserIcon className="h-5 w-5 mr-2" />
            <span>Profile Info</span>
          </button>
          
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === 'courses'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            <BookOpenIcon className="h-5 w-5 mr-2" />
            <span>My Courses</span>
          </button>
          
          <button
            onClick={() => setActiveTab('promocode')}
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === 'promocode'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-white'
            }`}
          >
            <KeyIcon className="h-5 w-5 mr-2" />
            <span>Promo Codes</span>
          </button>
        </div>
        
        {/* Tab content */}
        <div className="animate-fade-in">
          {activeTab === 'profile' && (
            <div className="bg-background-light p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Account Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Name
                  </label>
                  <div className="bg-background p-3 rounded-lg">
                    {user.name}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Email Address
                  </label>
                  <div className="bg-background p-3 rounded-lg">
                    {user.email}
                  </div>
                </div>
                
                {user.promoCode && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">
                      Active Promo Code
                    </label>
                    <div className="bg-background p-3 rounded-lg">
                      {user.promoCode}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'courses' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">My Courses</h2>
              
              {user.activatedCourses.length === 0 ? (
                <div className="bg-background-light p-6 rounded-lg text-center">
                  <p className="text-text-secondary mb-4">
                    You don't have any activated courses yet.
                  </p>
                  <button
                    onClick={() => setActiveTab('promocode')}
                    className="btn btn-primary"
                  >
                    Activate a Promo Code
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {user.activatedCourses.map((course) => (
                    <div key={course._id} className="card">
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-2">
                          {course.title}
                        </h3>
                        <p className="text-text-secondary text-sm mb-4">
                          {course.description.substring(0, 100)}
                          {course.description.length > 100 ? '...' : ''}
                        </p>
                        
                        <button
                          onClick={() => router.push(`/courses/${course._id}`)}
                          className="btn btn-primary w-full"
                        >
                          View Course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'promocode' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Activate a Promo Code</h2>
              <PromoCodeForm onSubmit={handlePromoCodeSubmit} />
              
              {user.activatedCourses.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium mb-2">
                    Your Activated Courses
                  </h3>
                  <ul className="bg-background-light rounded-lg divide-y divide-background">
                    {user.activatedCourses.map((course) => (
                      <li key={course._id} className="p-3">
                        {course.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
} 