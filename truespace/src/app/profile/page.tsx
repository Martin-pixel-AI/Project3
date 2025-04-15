"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navigation/Navbar';
import Loader from '../../components/ui/Loader';
import { UserIcon, BookOpenIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
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
              </div>
            </div>
          )}
          
          {activeTab === 'courses' && (
            <div className="bg-background-light p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">My Courses</h2>
              
              {user.activatedCourses && user.activatedCourses.length > 0 ? (
                <div className="space-y-4">
                  {user.activatedCourses.map((course: any) => (
                    <div key={course._id} className="p-4 bg-background rounded-lg flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{course.title}</h3>
                        <p className="text-sm text-text-secondary">{course.category}</p>
                      </div>
                      
                      <a
                        href={`/courses/${course._id}`}
                        className="text-primary hover:underline"
                      >
                        View Course
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-secondary">
                  <p>You haven't activated any courses yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
} 