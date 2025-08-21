'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { getRolePermissions } from '@/data/mockAuth';
import { authService } from '@/services/authService';
import { adminTenantService, AdminTenant } from '@/services/adminTenantService';

// Using AdminTenant interface from adminTenantService

// Calculate status based on rental dates and status (updated business rules)
const calculateRentalStatus = (rental: any): "Upcoming" | "Active" | "Inactive" | "Available" => {
  if (!rental) return "Available"; // No rentals - tenant is approved but hasn't rented any cube
  
  const now = new Date();
  const startDate = new Date(rental.startDate);
  const endDate = new Date(rental.endDate);
  
  if (rental.status === "ACTIVE" && now >= startDate && now <= endDate) {
    return "Active"; // Currently renting and within rental period
  } else if (now < startDate) {
    return "Upcoming"; // Has rental but start date is in future
  } else {
    return "Inactive"; // Rental period has ended
  }
};

export default function TenantDetailsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth');
      return;
    }

    if (user && !getRolePermissions(user.role).includes('tenants')) {
      router.push('/');
      return;
    }

    // Fetch tenant data from API
    const fetchTenant = async () => {
      try {
        setLoading(true);
        const tenants: AdminTenant[] = await adminTenantService.getTenants();
        const tenantId = params.id as string;
        const foundTenant = tenants.find(t => t.id === tenantId);
        
        setTenant(foundTenant || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tenant');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchTenant();
    }
  }, [isAuthenticated, isLoading, user, router, params.id]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || !getRolePermissions(user.role).includes('tenants')) {
    return null; // Will redirect
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Tenant</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/admin/tenants')}
              className="btn-primary"
            >
              Back to Tenant List
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tenant Not Found</h1>
            <p className="text-gray-600 mb-6">The requested tenant could not be found.</p>
            <button
              onClick={() => router.push('/admin/tenants')}
              className="btn-primary"
            >
              Back to Tenant List
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 text-sm font-medium rounded-full";
    
    switch (status) {
      case 'Active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'Upcoming':
         return `${baseClasses} bg-blue-100 text-blue-800`;
       case 'Inactive':
         return `${baseClasses} bg-red-100 text-red-800`;
       case 'Available':
         return `${baseClasses} bg-gray-100 text-gray-800`;
       default:
         return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const downloadPaymentHistory = () => {
    if (!tenant || !tenant.rentals || tenant.rentals.length === 0) {
      alert('No rental history available for this tenant');
      return;
    }

    // Create CSV content for rentals
    const headers = ['Rental ID', 'Cube Code', 'Start Date', 'End Date', 'Status', 'Daily Rent'];
    const csvContent = [
      headers.join(','),
      ...tenant.rentals.map(rental => [
        rental.id,
        rental.cube?.code || 'N/A',
        new Date(rental.startDate).toLocaleDateString(),
        new Date(rental.endDate).toLocaleDateString(),
        rental.status,
        `$${rental.dailyRent}`,
        rental.lastPayment ? new Date(rental.lastPayment).toLocaleDateString() : 'No payment'
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rental-history-${tenant.user.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/admin/tenants')}
                className="text-primary-600 hover:text-primary-800 mb-2 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Tenant List
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.user.name}</h1>
              <p className="text-gray-600 mt-1">{tenant.businessName}</p>
            </div>
            <span className={getStatusBadge(tenant.rentals && tenant.rentals.length > 0 ? calculateRentalStatus(tenant.rentals[0]) : 'Available')}>
              {tenant.rentals && tenant.rentals.length > 0 ? calculateRentalStatus(tenant.rentals[0]) : 'Available'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900">{tenant.user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{tenant.user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{tenant.user.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  <p className="text-gray-900">{tenant.businessName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{tenant.address}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{tenant.notes || 'No notes'}</p>
                </div>
              </div>
            </div>

            {/* Rental Information */}
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Rental Information</h2>
              {tenant.rentals && tenant.rentals.length > 0 ? (
                <div className="space-y-4">
                  {tenant.rentals.map((rental) => (
                    <div key={rental.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cube Code</label>
                          <p className="text-gray-900 font-semibold">{rental.cube?.code || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cube Size</label>
                          <p className="text-gray-900">{rental.cube?.size || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                          <p className="text-gray-900">{formatDate(rental.startDate)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                          <p className="text-gray-900">{formatDate(rental.endDate)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rent</label>
                          <p className="text-gray-900 text-lg font-semibold">{formatCurrency(rental.dailyRent || 0)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                          <span className={getStatusBadge(calculateRentalStatus(rental))}>
                            {calculateRentalStatus(rental)}
                          </span>
                        </div>
                        {/* <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Last Payment</label>
                          <p className="text-gray-900">{rental.lastPayment ? formatDate(rental.lastPayment) : 'No payment yet'}</p>
                        </div> */}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No rental information available</p>
              )}
            </div>

            {/* Rental History */}
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Rental History</h2>
                {tenant.rentals && tenant.rentals.length > 0 && (
                  <button
                    onClick={downloadPaymentHistory}
                    className="btn-secondary flex items-center space-x-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Download CSV</span>
                  </button>
                )}
              </div>
              {tenant.rentals && tenant.rentals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="table-header">Cube Code</th>
                        <th className="table-header">Start Date</th>
                        <th className="table-header">End Date</th>
                        <th className="table-header">Daily Rent</th>
                        <th className="table-header">Status</th>
                        {/* <th className="table-header">Last Payment</th> */}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenant.rentals.map((rental) => (
                        <tr key={rental.id} className="hover:bg-gray-50">
                          <td className="table-cell font-medium">{rental.cube?.code || 'N/A'}</td>
                          <td className="table-cell">{formatDate(rental.startDate)}</td>
                          <td className="table-cell">{formatDate(rental.endDate)}</td>
                          <td className="table-cell font-medium">{formatCurrency(rental.dailyRent)}</td>
                          <td className="table-cell">
                            <span className={getStatusBadge(rental.status)}>
                              {rental.status}
                            </span>
                          </td>
                          {/* <td className="table-cell text-gray-500">{rental.lastPayment ? formatDate(rental.lastPayment) : 'No payment yet'}</td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No rental history available</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Rentals</span>
                  <span className="font-medium">{tenant.rentals?.filter(r => r.status === 'ACTIVE').length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Rentals</span>
                  <span className="font-medium">{tenant.rentals?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Daily Rent</span>
                  <span className="font-medium">
                    {formatCurrency(
                      tenant.rentals?.reduce((sum, rental) => 
                        rental.status === 'ACTIVE' ? sum + rental.dailyRent : sum, 0
                      ) || 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Member Since</span>
                  <span className="font-medium">
                    {formatDate(tenant.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <a href={`mailto:${tenant.user.email}`} className="text-primary-600 hover:text-primary-800">
                    {tenant.user.email}
                  </a>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <a href={`tel:${tenant.user.phone}`} className="text-primary-600 hover:text-primary-800">
                    {tenant.user.phone}
                  </a>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-2">
                <button className="w-full btn-primary">
                  Send Message
                </button>
                <button className="w-full btn-secondary">
                  Generate Report
                </button>
                <button className="w-full btn-secondary">
                  View Lease Agreement
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}