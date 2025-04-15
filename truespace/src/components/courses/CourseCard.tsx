import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';

interface CourseCardProps {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail?: string;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const CourseCard: React.FC<CourseCardProps> = ({
  id,
  title,
  description,
  category,
  tags,
  thumbnail,
  isFavorite,
  onToggleFavorite
}) => {
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(id);
  };
  
  // Truncate description
  const truncatedDescription = description.length > 100
    ? `${description.substring(0, 100)}...`
    : description;
  
  return (
    <div className="card relative group">
      {/* Thumbnail */}
      <div className="relative w-full h-48 bg-background-lighter">
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-secondary">
            <span>No thumbnail</span>
          </div>
        )}
        
        {/* Category */}
        <div className="absolute top-2 left-2 bg-primary px-2 py-1 rounded text-xs font-semibold">
          {category}
        </div>
        
        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-1 rounded-full bg-background-light text-white hover:bg-primary transition-colors"
        >
          {isFavorite ? (
            <HeartIconSolid className="h-5 w-5 text-primary" />
          ) : (
            <HeartIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      {/* Content */}
      <Link href={`/courses/${id}`} className="block">
        <div className="p-4">
          <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-text-secondary text-sm mb-3">
            {truncatedDescription}
          </p>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag">
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="tag">+{tags.length - 3} more</span>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

export default CourseCard; 