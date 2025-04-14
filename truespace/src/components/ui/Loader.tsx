import React from 'react';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white';
}

const Loader: React.FC<LoaderProps> = ({ 
  size = 'medium', 
  color = 'primary'
}) => {
  const sizeMap = {
    small: 'w-5 h-5',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };
  
  const colorMap = {
    primary: 'border-primary',
    white: 'border-white',
  };
  
  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeMap[size]} border-4 border-t-transparent rounded-full animate-spin ${colorMap[color]}`}
        role="status"
        aria-label="loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default Loader; 