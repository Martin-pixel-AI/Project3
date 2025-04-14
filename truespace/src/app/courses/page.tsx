"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import Navbar from '../../components/navigation/Navbar';
import CourseCard from '../../components/courses/CourseCard';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

// Types
interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activatedCourses, setActivatedCourses] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Categories and tags derived from courses
  const categories = Array.from(
    new Set(courses.map((course) => course.category))
  ).sort();
  
  const tags = Array.from(
    new Set(courses.flatMap((course) => course.tags))
  ).sort();
  
  // Fetch courses data
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        
        // Build query URL with filters
        let url = '/api/courses';
        const params = new URLSearchParams();
        
        if (searchQuery) {
          params.append('q', searchQuery);
        }
        
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
        
        if (selectedTag) {
          params.append('tag', selectedTag);
        }
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error('Failed to fetch courses');
        }
        
        const data = await response.json();
        setCourses(data.courses);
        
      } catch (err) {
        console.error('Error fetching courses:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourses();
  }, [searchQuery, selectedCategory, selectedTag]);
  
  // Fetch user data (favorites and activated courses)
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          return; // User not logged in
        }
        
        const response = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Extract favorites and activated courses IDs
          const favoritesIds = (data.user.favorites || []).map((fav: any) => fav._id);
          const activatedCoursesIds = (data.user.activatedCourses || []).map((course: any) => course._id);
          
          setFavorites(favoritesIds);
          setActivatedCourses(activatedCoursesIds);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
    };
    
    fetchUserData();
  }, []);
  
  // Toggle favorite status
  const handleToggleFavorite = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not logged in
        window.location.href = '/auth';
        return;
      }
      
      const isFavorite = favorites.includes(courseId);
      const method = isFavorite ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/favorites/${courseId}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // Update local state
        setFavorites((prev) =>
          isFavorite
            ? prev.filter((id) => id !== courseId)
            : [...prev, courseId]
        );
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedTag(null);
  };
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Courses</h1>
          
          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-outline flex items-center gap-2 md:w-auto w-full"
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              <span>Filters</span>
            </button>
          </div>
          
          {/* Filter options */}
          {showFilters && (
            <div className="bg-background-light p-4 rounded-lg mb-6 animate-slide-down">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Category</label>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="input"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Tag</label>
                  <select
                    value={selectedTag || ''}
                    onChange={(e) => setSelectedTag(e.target.value || null)}
                    className="input"
                  >
                    <option value="">All Tags</option>
                    {tags.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                onClick={handleResetFilters}
                className="btn btn-secondary w-full"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
        
        {/* Courses grid */}
        {loading ? (
          <div className="py-16">
            <Loader size="large" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error}
          </div>
        ) : courses.length === 0 ? (
          <EmptyState
            title="No courses found"
            description="Try adjusting your search or filters to find what you're looking for."
            action={{ label: 'Reset Filters', href: '#' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course._id}
                id={course._id}
                title={course.title}
                description={course.description}
                category={course.category}
                tags={course.tags}
                thumbnail={course.thumbnail}
                isFavorite={favorites.includes(course._id)}
                onToggleFavorite={handleToggleFavorite}
                isLocked={!activatedCourses.includes(course._id)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
} 