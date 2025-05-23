"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/navigation/Navbar';
import VideoPlayer from '../../../components/courses/VideoPlayer';
import Loader from '../../../components/ui/Loader';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface Video {
  _id: string;
  title: string;
  youtubeUrl: string;
  duration: number;
  description?: string;
  tags: string[];
}

interface Course {
  _id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  videos?: Video[];
  thumbnail?: string;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  
  const courseId = params.id as string;
  
  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First, fetch basic course info (public)
        const response = await fetch(`/api/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch course');
        }
        
        const data = await response.json();
        setCourse(data.course);
        
        const token = localStorage.getItem('token');
        if (!token) {
          // Redirect to login if not logged in
          router.push('/auth');
          return;
        }
        
        // Prepare headers for full course request
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
        
        // Try to fetch course with videos (requires authorization)
        const fullCourseResponse = await fetch(`/api/courses/${courseId}`, {
          method: 'POST',
          headers
        });
        
        if (fullCourseResponse.ok) {
          const fullCourseData = await fullCourseResponse.json();
          setCourse(fullCourseData.course);
          
          // Enable video player
          setShowVideoPlayer(fullCourseData.course.videos?.length > 0);
          
          // Set first video as selected if available
          if (fullCourseData.course.videos?.length) {
            setSelectedVideo(fullCourseData.course.videos[0]);
          }
        } else {
          // If there's an error getting full course, just show user they need to login
          router.push('/auth');
        }
        
        // Check if course is in favorites
        const userResponse = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          const favoritesArray = Array.isArray(userData.favorites) ? userData.favorites : [];
          setIsFavorite(favoritesArray.some((fav: any) => {
            return typeof fav === 'string' ? fav === courseId : fav && fav._id === courseId;
          }));
        }
        
      } catch (err) {
        console.error('Error fetching course:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [courseId, router]);
  
  // Toggle favorite status
  const handleToggleFavorite = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Redirect to login if not logged in
        router.push('/auth');
        return;
      }
      
      const method = isFavorite ? 'DELETE' : 'POST';
      
      const response = await fetch(`/api/favorites/${courseId}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        // Update local state
        setIsFavorite(!isFavorite);
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
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
  
  if (error || !course) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="p-4 bg-red-900/30 text-red-200 rounded-lg">
            {error || 'Course not found'}
          </div>
        </main>
      </>
    );
  }
  
  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: course info */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-start mb-4">
              <h1 className="text-3xl font-bold">{course.title}</h1>
              
              <button
                onClick={handleToggleFavorite}
                className="p-2 rounded-full bg-background-light text-white hover:bg-primary transition-colors"
              >
                {isFavorite ? (
                  <HeartIconSolid className="h-6 w-6 text-primary" />
                ) : (
                  <HeartIcon className="h-6 w-6" />
                )}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-primary px-3 py-1 rounded text-sm font-semibold">
                {course.category}
              </span>
              
              {course.tags.map((tag) => (
                <span key={tag} className="tag">
                  #{tag}
                </span>
              ))}
            </div>
            
            <p className="text-text-secondary mb-8 whitespace-pre-line">
              {course.description}
            </p>
            
            {showVideoPlayer && selectedVideo ? (
              <VideoPlayer
                videoId={selectedVideo.youtubeUrl}
                title={selectedVideo.title}
              />
            ) : (
              <div className="bg-background-light rounded-lg p-6">
                <p className="text-center text-text-secondary">
                  {!course.videos?.length 
                    ? "No videos available for this course." 
                    : "Select a video from the playlist to start watching."}
                </p>
              </div>
            )}
          </div>
          
          {/* Right column: video list */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Course Videos</h2>
            
            {course.videos && course.videos.length > 0 ? (
              <div className="space-y-2">
                {course.videos.map((video) => (
                  <button
                    key={video._id}
                    onClick={() => setSelectedVideo(video)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedVideo?._id === video._id
                        ? 'bg-primary/20 border border-primary'
                        : 'bg-background-light hover:bg-background-lighter'
                    }`}
                  >
                    <h3 className="font-medium">{video.title}</h3>
                    <p className="text-sm text-text-secondary">
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-background-light rounded-lg p-4">
                <p className="text-text-secondary">
                  No videos available for this course.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
} 