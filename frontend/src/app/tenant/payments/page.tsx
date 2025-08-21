'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TenantPayments() {
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Payments</h1>
              <p className="text-lg text-gray-600 mb-6">
                View rent payments and commission earnings
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-orange-800 mb-2">Coming Soon!</h2>
                <p className="text-orange-700">
                  We're working hard to bring you comprehensive payment tracking and commission management. 
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