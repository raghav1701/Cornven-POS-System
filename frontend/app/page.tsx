'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getRolePermissions, getRoleDisplayName } from '@/data/mockAuth';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
    }
    // Remove automatic redirects - let users choose their module from the dashboard
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null; // Will redirect to auth
  }

  const userPermissions = getRolePermissions(user.role);

  const modules = [
    // Admin modules
    {
      name: 'Tenant Management',
      href: '/admin/tenants',
      permission: 'tenants',
      description: 'Manage tenants, leases, and rental collections',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'primary'
    },
    {
      name: 'Inventory',
      href: '/inventory',
      permission: 'inventory',
      description: 'Track products, stock levels, and suppliers',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'primary'
    },
    {
      name: 'POS Terminal',
      href: '/pos',
      permission: 'pos',
      description: 'Process sales and manage transactions',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: 'accent'
    },
    {
      name: 'Reports',
      href: '/reports',
      permission: 'reports',
      description: 'Analytics and business intelligence',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
        </svg>
      ),
      color: 'success'
    },
    {
      name: 'Rentals',
      href: '/admin/rentals',
      permission: 'tenants',
      description: 'Manage rental properties and payment history',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      color: 'primary'
    },
    // Tenant modules
    {
      name: 'My Dashboard',
      href: '/tenant',
      permission: 'tenant-dashboard',
      description: 'View your sales, products, and performance',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v0M8 11h8" />
        </svg>
      ),
      color: 'primary'
    },

    {
      name: 'My Sales',
      href: '/tenant/sales',
      permission: 'tenant-sales',
      description: 'Coming Soon - Track your sales and transaction history',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 00-2-2z" />
        </svg>
      ),
      color: 'accent',
      comingSoon: true
    },
    {
      name: 'Payments',
      href: '/tenant/payments',
      permission: 'tenant-payments',
      description: 'Coming Soon - View rent payments and commission earnings',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      color: 'success',
      comingSoon: true
    }
  ];

  const accessibleModules = modules.filter(module => userPermissions.includes(module.permission));
  const restrictedModules = modules.filter(module => !userPermissions.includes(module.permission));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header with user info and logout */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">Cornven POS</h2>
            <span className="text-gray-500">|</span>
            <span className="text-gray-600">{user.name} ({getRoleDisplayName(user.role)})</span>
          </div>
          <button
            onClick={() => {
              // Clear localStorage and logout
              localStorage.removeItem('cornven_user');
              window.location.reload();
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome, {user.name}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Cornven POS System - Your personalized dashboard
          </p>
        </div>

        {/* Accessible Modules */}
        {accessibleModules.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Your Modules</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {accessibleModules.map((module) => (
                module.comingSoon ? (
                  <div key={module.name} className="group cursor-not-allowed">
                    <div className="bg-white rounded-xl shadow-lg p-8 opacity-75">
                      <div className={`w-16 h-16 bg-${module.color}-100 rounded-lg flex items-center justify-center mb-6 text-${module.color}-600`}>
                        {module.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{module.name}</h3>
                      <p className="text-gray-600 mb-4">{module.description}</p>
                      <span className="text-orange-600 font-medium">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                ) : (
                  <Link key={module.name} href={module.href} className="group">
                    <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                      <div className={`w-16 h-16 bg-${module.color}-100 rounded-lg flex items-center justify-center mb-6 group-hover:bg-${module.color}-200 transition-colors text-${module.color}-600`}>
                        {module.icon}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">{module.name}</h3>
                      <p className="text-gray-600 mb-4">{module.description}</p>
                      <span className={`text-${module.color}-600 font-medium group-hover:text-${module.color}-700`}>
                        Access Module →
                      </span>
                    </div>
                  </Link>
                )
              ))}
            </div>
          </div>
        )}

        {/* Restricted Modules */}
        {restrictedModules.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">Restricted Access</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {restrictedModules.map((module) => (
                <div key={module.name} className="group cursor-not-allowed opacity-60">
                  <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-6 text-gray-400">
                      {module.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">{module.name}</h3>
                    <p className="text-gray-600 mb-4">{module.description}</p>
                    <span className="text-gray-400 font-medium">
                      No Access
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-16">
          <p className="text-gray-500">
            Built for Cornven Cube Store • Version 1.0
          </p>
        </div>
      </div>
    </div>
  );
}