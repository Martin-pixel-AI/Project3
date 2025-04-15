"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/navigation/Navbar';
import CourseCard from '../../components/courses/CourseCard';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import { HeartIcon } from '@heroicons/react/24/outline';

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Course[]>([]);
  const [activatedCourses, setActivatedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch favorites data
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Redirect to login if not logged in
          router.push('/auth');
          return;
        }
        
        // Get favorites
        const favResponse = await fetch('/api/favorites', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!favResponse.ok) {
          throw new Error('Failed to fetch favorites');
        }
        
        const favData = await favResponse.json();
        setFavorites(favData.favorites || []);
        
        // Get user data to know which courses are activated
        const userResponse = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const activatedCoursesIds = (userData.user.activatedCourses || []).map((course: any) => course._id);
          setActivatedCourses(activatedCoursesIds);
        }
        
      } catch (err) {
        console.error('Error fetching favorites:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavorites();
  }, [router]);
  
  // Toggle favorite status (remove from favorites)
  const handleToggleFavorite = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/auth');
        return;
      }
      
      const response = await fetch(`/api/favorites/${courseId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // Update local state by removing the course
        setFavorites((prev) => prev.filter((course) => course._id !== courseId));
      }
    } catch (err) {
      console.error('Error removing from favorites:', err);
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
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Favorites</h1>
        
        {error ? (
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error}
          </div>
        ) : favorites.length === 0 ? (
          <EmptyState
            title="No favorites yet"
            description="Add courses to your favorites to easily find them later."
            icon={<HeartIcon className="h-12 w-12 text-primary/50" />}
            action={{ label: 'Browse Courses', href: '/courses' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((course) => (
              <CourseCard
                key={course._id}
                id={course._id}
                title={course.title}
                description={course.description}
                category={course.category}
                tags={course.tags}
                thumbnail={course.thumbnail}
                isFavorite={true}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
} 