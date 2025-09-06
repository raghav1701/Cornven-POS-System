'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';

const TenantDashboard = () => {
  return (
    <AuthGuard requiredRole="TENANT">
      <TenantDashboardContent />
    </AuthGuard>
  );
};

const TenantDashboardContent = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to products page for now
    router.push('/tenant/products');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tenant Dashboard</h1>
        <p className="text-gray-600 mb-6">Redirecting to products...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default TenantDashboard;