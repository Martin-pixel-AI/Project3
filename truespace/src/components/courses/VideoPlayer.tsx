"use client";

import React, { useState, useEffect } from 'react';

interface VideoPlayerProps {
  videoId: string;
  title: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoId, title }) => {
  const [isClient, setIsClient] = useState(false);
  
  // Detect if we're on the client side to safely render iframes
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Extract YouTube ID from URL if full URL is provided
  const getYouTubeId = (url: string): string => {
    if (url.length === 11) return url; // Already an ID
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11)
      ? match[2]
      : url;
  };
  
  const embedId = getYouTubeId(videoId);
  
  if (!isClient) {
    return (
      <div className="w-full aspect-video bg-background-lighter flex items-center justify-center">
        <p className="text-text-secondary">Loading video player...</p>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-lg">
        <iframe
          className="absolute top-0 left-0 w-full h-full"
          src={`https://www.youtube.com/embed/${embedId}`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      
      <h2 className="text-xl font-semibold mt-4 mb-2">{title}</h2>
    </div>
  );
};

export default VideoPlayer; 