'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TenantSales() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'tenant') {
      router.push('/auth');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'tenant') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <div className="text-center">
              <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">My Sales</h1>
              <p className="text-lg text-gray-600 mb-6">
                Track your sales and transaction history
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-orange-800 mb-2">Coming Soon!</h2>
                <p className="text-orange-700">
                  We're working hard to bring you comprehensive sales tracking and analytics. 
                  This feature will be available soon.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="text-center">
            <button
              onClick={() => router.push('/tenant')}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}