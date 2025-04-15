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
import EmergencyFix from './EmergencyFix';
import { addDirectAccessHeader, hasDirectAccessToken } from '@/lib/directAccess';

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
          setIsLocked(true);
          setLoading(false);
          return;
        }
        
        // Check for direct access token
        const hasDirectAccess = hasDirectAccessToken(courseId);
        
        // Prepare headers for full course request
        let headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };
        
        // Add direct access token if available
        if (hasDirectAccess) {
          headers = addDirectAccessHeader(courseId, headers);
          console.log('Using direct access token for course request');
        }
        
        // Try to fetch course with videos (requires authorization)
        const fullCourseResponse = await fetch(`/api/courses/${courseId}`, {
          method: 'POST',
          headers
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
          
          // Log if this was a direct access success
          if (fullCourseData.accessMethod === 'direct_access_token') {
            console.log('Successfully accessed course via direct access token');
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
      
      // Make sure we have a valid courseId
      if (!courseId) {
        throw new Error('Course ID is missing, cannot activate promo code');
      }
      
      // Activate promo code
      let response;
      try {
        // Explicitly log what we're sending to the API
        const requestBody = { code, courseId };
        console.log('Sending to /api/promo/activate:', requestBody);
        
        response = await fetch('/api/promo/activate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
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
      
      // Check for errors in the response
      if (!response.ok) {
        const errorMsg = activationData.error || 'Failed to activate promo code';
        console.error('Activation error:', errorMsg);
        throw new Error(errorMsg);
      }
      
      // Success! Reload the course data to show unlocked content
      console.log('Promo code activated successfully!');
      
      // Adding a delay to ensure the database change is reflected
      // This helps avoid race conditions where the course data might not 
      // be immediately updated in the database
      setTimeout(async () => {
        try {
          // Re-fetch the course data
          const token = localStorage.getItem('token');
          if (!token) return;
          
          const fullCourseResponse = await fetch(`/api/courses/${courseId}`, {
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
            console.error('Failed to update course data after promo activation');
            // Try to use debug endpoint to fix access
            await fetch('/api/debug/course-access/direct-fix', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ courseId }),
            });
            // Reload the page entirely as a fallback
            window.location.reload();
          }
        } catch (fetchError) {
          console.error('Error fetching updated course data:', fetchError);
          // Reload the entire page as a fallback
          window.location.reload();
        }
      }, 1500); // 1.5 second delay
      
    } catch (err) {
      console.error('Promo code activation error:', err);
      throw err; // Re-throw to be handled by the form component
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
                
                {/* Emergency fix component */}
                {localStorage.getItem('token') && (
                  <EmergencyFix 
                    courseId={courseId} 
                    token={localStorage.getItem('token') || ''} 
                  />
                )}
                
                {/* Link to check access */}
                <div className="mt-4 text-center">
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        if (!token) {
                          alert('You need to log in first');
                          router.push('/auth');
                          return;
                        }
                        
                        const response = await fetch('/api/debug/access', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ courseId }),
                        });
                        
                        const data = await response.json();
                        console.log('Access debug data:', data);
                        
                        if (data.diagnostics?.shouldHaveAccess) {
                          // User should have access, attempt to fix it
                          const fixResponse = await fetch('/api/debug/fix-access', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ courseId }),
                          });
                          
                          const fixData = await fixResponse.json();
                          console.log('Fix result:', fixData);
                          
                          if (fixData.fixApplied || fixData.alreadyHadAccess) {
                            alert(`Access fixed for course "${fixData.courseName || courseId}"! Refreshing page...`);
                            window.location.reload();
                          } else if (fixData.error) {
                            alert(`Could not fix access: ${fixData.error}`);
                          } else {
                            alert(`Access check shows you should have access. Please try refreshing the page.`);
                            window.location.reload();
                          }
                        } else {
                          alert(`Debug info: No access detected. Please try activating the promo code again.`);
                        }
                      } catch (err) {
                        console.error('Debug access check error:', err);
                        alert('Error checking access. See console for details.');
                      }
                    }}
                    className="text-sm text-primary underline hover:no-underline"
                  >
                    Having trouble? Click here to check access
                  </button>
                </div>
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