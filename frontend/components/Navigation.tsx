'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleDisplayName, getRolePermissions } from '@/data/mockAuth';

const Navigation = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };

  if (!user) return null;

  const userPermissions = getRolePermissions(user.role);

  const getNavItems = () => {
    const baseItems = [];
    
    // Admin items
    if (userPermissions.includes('tenants')) {
      baseItems.push({ name: 'Dashboard', href: '/admin', permission: 'tenants' });
    }
    if (userPermissions.includes('tenants')) {
      baseItems.push({ name: 'Tenants', href: '/admin/tenants', permission: 'tenants' });
    }
    if (userPermissions.includes('admin-products')) {
      // baseItems.push({ name: 'Products', href: '/admin/products', permission: 'admin-products' });
    }
    if (userPermissions.includes('admin-sales')) {
      baseItems.push({ name: 'Sales', href: '/admin/sales', permission: 'admin-sales' });
    }
    
    // Tenant items
    if (userPermissions.includes('tenant-dashboard')) {
      baseItems.push({ name: 'Dashboard', href: '/tenant', permission: 'tenant-dashboard' });
    }
    if (userPermissions.includes('tenant-products')) {
      baseItems.push({ name: 'My Products', href: '/tenant/products', permission: 'tenant-products' });
    }
    if (userPermissions.includes('tenant-sales')) {
      baseItems.push({ name: 'My Sales', href: '/tenant/sales', permission: 'tenant-sales' });
    }
    if (userPermissions.includes('tenant-payments')) {
      baseItems.push({ name: 'Payments', href: '/tenant/payments', permission: 'tenant-payments' });
    }
    
    // Common items
    if (userPermissions.includes('pos')) {
      baseItems.push({ name: 'POS', href: '/pos', permission: 'pos' });
    }
    if (userPermissions.includes('inventory')) {
      baseItems.push({ name: 'Inventory', href: '/inventory', permission: 'inventory' });
    }
    if (userPermissions.includes('reports')) {
      baseItems.push({ name: 'Reports', href: '/reports', permission: 'reports' });
    }
    
    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Cornven POS</h1>
            </div>
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-4 lg:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${
                    pathname === item.href
                      ? 'border-primary-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          
          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium hidden lg:inline">{user.name}</span>
              <span className="ml-2 px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs">
                {getRoleDisplayName(user.role)}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${
                  pathname === item.href
                    ? 'bg-primary-50 border-primary-500 text-primary-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors`}
              >
                {item.name}
              </Link>
            ))}
            
            {/* Mobile User Info */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user.name}</div>
                  <div className="text-sm text-gray-500">{getRoleDisplayName(user.role)}</div>
                </div>
              </div>
              <div className="mt-3 px-2 space-y-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 rounded-md text-base font-medium text-white bg-red-600 hover:bg-red-700 w-full transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;