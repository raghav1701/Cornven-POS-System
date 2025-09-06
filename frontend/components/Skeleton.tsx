'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'rectangular':
        return 'rounded-md';
      case 'text':
      default:
        return 'rounded';
    }
  };

  const getDefaultDimensions = () => {
    switch (variant) {
      case 'circular':
        return { width: '40px', height: '40px' };
      case 'rectangular':
        return { width: '100%', height: '200px' };
      case 'text':
      default:
        return { width: '100%', height: '1rem' };
    }
  };

  const defaultDimensions = getDefaultDimensions();
  const style = {
    width: width || defaultDimensions.width,
    height: height || defaultDimensions.height
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : style.width // Last line is shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
};

// Predefined skeleton components for common use cases
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => (
  <tr className="border-b border-gray-200">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4">
        <Skeleton height="1rem" />
      </td>
    ))}
  </tr>
);

export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
    <div className="space-y-4">
      <Skeleton variant="rectangular" height="200px" />
      <Skeleton lines={2} />
      <div className="flex justify-between items-center">
        <Skeleton width="30%" />
        <Skeleton width="20%" />
      </div>
    </div>
  </div>
);

export const ListItemSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center space-x-4 p-4 ${className}`}>
    <Skeleton variant="circular" width="48px" height="48px" />
    <div className="flex-1 space-y-2">
      <Skeleton width="60%" />
      <Skeleton width="40%" />
    </div>
    <Skeleton width="80px" />
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="space-y-2">
      <Skeleton width="300px" height="2rem" />
      <Skeleton width="500px" />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <div className="space-y-3">
            <Skeleton width="60%" />
            <Skeleton width="40%" height="2rem" />
            <Skeleton width="80%" />
          </div>
        </div>
      ))}
    </div>
    
    {/* Main Content */}
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <Skeleton width="200px" height="1.5rem" />
      </div>
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} height="4rem" />
        ))}
      </div>
    </div>
  </div>
);

export default Skeleton;