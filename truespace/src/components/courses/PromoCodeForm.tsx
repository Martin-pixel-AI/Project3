"use client";

import React from 'react';

interface PromoCodeFormProps {
  onSubmit: (code: string) => Promise<void>;
  courseId?: string;
}

// This is a stub component that exists only for backward compatibility
// Actual promo code functionality has been removed from the platform
const PromoCodeForm: React.FC<PromoCodeFormProps> = () => {
  return (
    <div className="bg-background-light p-6 rounded-lg shadow-md animate-fade-in">
      <h3 className="text-xl font-semibold mb-4">
        Course Access
      </h3>
      
      <p className="text-text-secondary mb-4">
        All courses are now automatically available to registered users. No promo code required!
      </p>
    </div>
  );
};

export default PromoCodeForm; 