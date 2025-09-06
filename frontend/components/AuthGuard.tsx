'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'TENANT';
  fallbackPath?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  requiredRole,
  fallbackPath = '/auth'
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace(fallbackPath);
        return;
      }
      
      if (requiredRole && user?.role !== requiredRole.toLowerCase()) {
        // Redirect to appropriate dashboard based on user role
        const redirectPath = user?.role === 'admin' ? '/admin' : '/tenant';
        router.replace(redirectPath);
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, requiredRole, router, fallbackPath]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if not authenticated or wrong role
  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole.toLowerCase())) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
};

export default AuthGuard;