'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminTenantService, AdminTenant } from '@/services/adminTenantService';
import { authService } from '@/services/authService';

interface Rental {
  id: string;
  tenantName: string;
  propertyAddress: string;
  rentAmount: number;
  status: 'active' | 'overdue' | '-';
  lastPaymentDate?: string;
  nextDueDate: string;
}

const RentalsPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadRentals = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Check if auth token exists
        const token = authService.getAuthToken();
        if (!token) {
          setError('Authentication token not found. Please log in again.');
          router.push('/auth');
          return;
        }

        // Fetch real data from API
        const tenants: AdminTenant[] = await adminTenantService.getTenants();
        
        // Convert tenant data to rental format
        const rentalsData: Rental[] = [];
        
        tenants.forEach(tenant => {
          tenant.rentals.forEach(rental => {
            const now = new Date();
            const endDate = new Date(rental.endDate);
            const lastPaymentDate = rental.lastPayment ? new Date(rental.lastPayment) : null;
            
            // Determine status based on rental data
            let status: 'active' | 'overdue' | '-' = '-';
            if (rental.status === 'ACTIVE') {
              if (now <= endDate) {
                // Check if payment is overdue (assuming monthly payments)
                const nextDueDate = new Date(rental.startDate);
                nextDueDate.setMonth(nextDueDate.getMonth() + Math.floor((now.getTime() - new Date(rental.startDate).getTime()) / (30 * 24 * 60 * 60 * 1000)) + 1);
                
                if (lastPaymentDate) {
                  const daysSinceLastPayment = Math.floor((now.getTime() - lastPaymentDate.getTime()) / (24 * 60 * 60 * 1000));
                  status = daysSinceLastPayment > 35 ? 'overdue' : 'active'; // 35 days grace period
                } else {
                  const daysSinceStart = Math.floor((now.getTime() - new Date(rental.startDate).getTime()) / (24 * 60 * 60 * 1000));
                  status = daysSinceStart > 35 ? 'overdue' : 'active';
                }
              }
            }
            
            // Calculate next due date (first day of next month)
            const nextDue = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            
            rentalsData.push({
              id: rental.id,
              tenantName: tenant.user.name,
              propertyAddress: `${tenant.address} - Cube ${rental.cube?.code || 'N/A'}`,
              rentAmount: rental.dailyRent,
              status,
              lastPaymentDate: rental.lastPayment || undefined,
              nextDueDate: nextDue.toISOString().split('T')[0]
            });
          });
        });
        
        setRentals(rentalsData);
      } catch (err) {
        console.error('Error loading rentals:', err);
        setError(err instanceof Error ? err.message : 'Failed to load rentals');
      } finally {
        setLoading(false);
      }
    };

    loadRentals();
  }, [router]);

  const filteredRentals = rentals.filter(rental =>
    rental.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rental.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case '-':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Rentals</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Rental Management</h1>
          <p className="text-gray-600 mt-2">Manage rental properties and payment histories</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Rentals
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  placeholder="Search by tenant name or property address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Rentals Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Active Rentals</h2>
            <p className="text-gray-600 mt-1">Click on any rental to view payment history</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Payment
                  </th> */}
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Due
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRentals.map((rental) => (
                  <tr key={rental.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{rental.tenantName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{rental.propertyAddress}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(rental.rentAmount)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(rental.status)}`}>
                        {rental.status.charAt(0).toUpperCase() + rental.status.slice(1)}
                      </span>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rental.lastPaymentDate ? formatDate(rental.lastPaymentDate) : 'No payments'}
                    </td> */}
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(rental.nextDueDate)}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => router.push(`/admin/rentals/${rental.id}/payments`)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                      >
                        View Payments
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRentals.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No rentals found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search criteria.' : 'No rental properties are currently registered.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RentalsPage;