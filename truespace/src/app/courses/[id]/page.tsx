"use client";

import { Metadata } from 'next';
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '../../../components/navigation/Navbar';
import VideoPlayer from '../../../components/courses/VideoPlayer';
import PromoCodeForm from '../../../components/courses/PromoCodeForm';
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
  const [isLocked, setIsLocked] = useState(true);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  
  const courseId = params.id as string;
  
  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        
        // First, fetch basic course info (public)
        const response = await fetch(`/api/courses/${courseId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch course');
        }
        
        const data = await response.json();
        setCourse(data.course);
        
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLocked(true);
          setLoading(false);
          return;
        }
        
        // Try to fetch course with videos (requires authorization)
        const fullCourseResponse = await fetch(`/api/courses/${courseId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (fullCourseResponse.ok) {
          const fullCourseData = await fullCourseResponse.json();
          setCourse(fullCourseData.course);
          
          // If we get videos, the course is unlocked
          setIsLocked(false);
          setShowVideoPlayer(fullCourseData.course.videos?.length > 0);
          
          // Set first video as selected if available
          if (fullCourseData.course.videos?.length) {
            setSelectedVideo(fullCourseData.course.videos[0]);
          }
        } else {
          // If not authorized, course remains locked
          setIsLocked(true);
        }
        
        // Check if course is in favorites
        const userResponse = await fetch('/api/user/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          // Проверяем, что userData.favorites существует перед использованием
          const favoritesArray = Array.isArray(userData.favorites) ? userData.favorites : [];
          setIsFavorite(favoritesArray.some((fav: any) => {
            // Проверяем, является ли элемент строкой или объектом с _id
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
  }, [courseId]);
  
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
  
  // Handle promo code submission
  const handlePromoCodeSubmit = async (code: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/auth');
        return;
      }
      
      console.log('Attempting to activate promo code:', code);
      console.log('For course ID:', courseId);
      
      // Activate promo code
      let response;
      try {
        response = await fetch('/api/promo/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, courseId }),
        });
      } catch (fetchError) {
        console.error('Network error during promo activation:', fetchError);
        throw new Error('Network error: Could not connect to server');
      }
      
      console.log('Promo activation status:', response.status);
      
      // Get the response data even if status is not 200
      let activationData;
      try {
        activationData = await response.json();
        console.log('Promo activation response:', activationData);
      } catch (jsonError) {
        console.error('Error parsing activation response:', jsonError);
        throw new Error('Invalid response format from server');
      }
      
      // If we got a 400 error but it's just because the user already has this promo code,
      // we'll treat it as a success and continue
      if (!response.ok) {
        if (response.status === 400 && 
            activationData?.error?.includes('already activated')) {
          console.log('Promo code already activated - continuing with course loading');
          // Continue with course loading even though activation "failed"
        } else {
          // For other errors, throw the error message
          const errorMessage = activationData?.error || `Error ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }
      }
      
      // Enhanced logging for troubleshooting
      console.log('User auth state:', { isAuthenticated: !!token, userId: localStorage.getItem('userId') });
      console.log('Course access check before timeout:', { 
        courseId, 
        isLocked, 
        showVideoPlayer,
        hasVideos: course?.videos && course.videos.length > 0 
      });
      
      // After successful activation, we need to wait for database changes to propagate
      // The delay was increased from 1 to 3 seconds, but we'll increase it further to 5 seconds
      // to ensure database changes are fully applied
      console.log(`Waiting 5 seconds for database changes to propagate...`);
      setTimeout(async () => {
        try {
          console.log('Fetching updated course data after promo activation');
          console.log('Auth token for course fetch:', token ? `${token.substring(0, 15)}...` : 'No token');
          
          // Making multiple attempts to fetch the course data in case of database replication lag
          let fetchAttempts = 0;
          const maxAttempts = 3;
          let fullCourseData = null;
          
          while (fetchAttempts < maxAttempts && !fullCourseData?.course?.videos?.length) {
            fetchAttempts++;
            console.log(`Attempt ${fetchAttempts} to fetch course data...`);
            
            // Делаем повторный запрос полных данных курса
            const fullCourseResponse = await fetch(`/api/courses/${courseId}`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
              },
              // Adding cache control to prevent cached responses
              cache: 'no-store',
            });
            
            if (!fullCourseResponse.ok) {
              console.error(`Failed fetch attempt ${fetchAttempts}: ${fullCourseResponse.status}`);
              if (fetchAttempts === maxAttempts) {
                throw new Error(`Failed to fetch course data: ${fullCourseResponse.status}`);
              }
              // Wait 2 seconds between attempts
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            try {
              fullCourseData = await fullCourseResponse.json();
              console.log(`Fetch attempt ${fetchAttempts} response:`, fullCourseData);
            } catch (jsonError) {
              console.error(`Error parsing JSON in attempt ${fetchAttempts}:`, jsonError);
              if (fetchAttempts === maxAttempts) {
                throw new Error('Invalid response format from server');
              }
              // Wait 2 seconds between attempts
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            
            // If we have videos, we can stop trying
            if (fullCourseData?.course?.videos?.length) {
              console.log(`Successfully received course data with videos on attempt ${fetchAttempts}`);
              break;
            } else {
              console.log(`No videos in response, trying again in 2 seconds...`);
              // Wait 2 seconds between attempts
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          console.log('Final course data after promo activation:', {
            courseId: fullCourseData?.course?._id,
            title: fullCourseData?.course?.title,
            hasAccess: fullCourseData?.hasAccess,
            videoCount: fullCourseData?.course?.videos?.length || 0,
            isUser: fullCourseData?.isUser,
            isAdmin: fullCourseData?.isAdmin
          });
          
          if (fullCourseData && fullCourseData.course && fullCourseData.course.videos?.length > 0) {
            console.log('Updating UI with new course data that includes videos');
            setCourse(fullCourseData.course);
            
            // Если получили видео, значит курс доступен
            setIsLocked(false);
            setShowVideoPlayer(true);
            
            // Устанавливаем первое видео как выбранное
            setSelectedVideo(fullCourseData.course.videos[0]);
          } else {
            console.error('Failed to get course with videos:', fullCourseData?.error || 'No videos returned');
            alert('Промокод был активирован, но курс всё ещё недоступен. Пожалуйста, обновите страницу или обратитесь в поддержку.');
            
            // Force page reload after a short delay
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } catch (error) {
          console.error('Error fetching course after promo activation:', error);
          alert('Промокод был активирован, но произошла ошибка при загрузке видео. Страница будет перезагружена.');
          window.location.reload();
        }
      }, 5000); // Increasing delay from 3 seconds to 5 seconds for more reliable database updates
      
    } catch (err) {
      console.error('Error activating promo code:', err);
      let errorMessage = 'Не удалось активировать промокод';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String((err as any).message);
      }
      
      alert(errorMessage);
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
            ) : isLocked ? (
              <div className="bg-background-light rounded-lg p-6 animate-fade-in">
                <h2 className="text-xl font-semibold mb-4">
                  This course requires a promo code
                </h2>
                <p className="text-text-secondary mb-6">
                  To access this course, you need to activate it with a valid promo code.
                </p>
                
                <PromoCodeForm onSubmit={handlePromoCodeSubmit} courseId={courseId} />
              </div>
            ) : (
              <div className="bg-background-light rounded-lg p-6">
                <p className="text-center text-text-secondary">
                  Select a video from the playlist to start watching.
                </p>
              </div>
            )}
          </div>
          
          {/* Right column: video list */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Course Videos</h2>
            
            {isLocked ? (
              <div className="bg-background-light rounded-lg p-4">
                <p className="text-text-secondary">
                  Videos are locked. Activate a promo code to access this course.
                </p>
              </div>
            ) : course.videos && course.videos.length > 0 ? (
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