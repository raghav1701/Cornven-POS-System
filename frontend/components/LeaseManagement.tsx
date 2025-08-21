'use client';

import { useState } from 'react';
import { Tenant } from '@/types/tenant';
import { calculateLeaseStatus } from '@/data/mockData';

interface LeaseManagementProps {
  tenants: Tenant[];
  onUpdateLease: (tenantId: string, startDate: string, endDate: string) => void;
}

const LeaseManagement = ({ tenants, onUpdateLease }: LeaseManagementProps) => {
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenant(tenantId);
    const tenant = tenants.find(t => t.id === tenantId);
    if (tenant) {
      setStartDate(tenant.leaseStartDate);
      setEndDate(tenant.leaseEndDate);
    }
  };

  const handleUpdateLease = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTenant && startDate && endDate) {
      if (new Date(startDate) >= new Date(endDate)) {
        alert('End date must be after start date');
        return;
      }
      onUpdateLease(selectedTenant, startDate, endDate);
      alert('Lease updated successfully!');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Upcoming':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Expired':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const selectedTenantData = tenants.find(t => t.id === selectedTenant);

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Lease Management</h2>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Tenant Selection and Form */}
        <div>
          <form onSubmit={handleUpdateLease} className="space-y-4">
            <div>
              <label htmlFor="tenant-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Tenant
              </label>
              <select
                id="tenant-select"
                value={selectedTenant}
                onChange={(e) => handleTenantSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="">Choose a tenant</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} - {tenant.businessName} ({tenant.cubeId})
                  </option>
                ))}
              </select>
            </div>

            {selectedTenant && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
                      Lease Start Date
                    </label>
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
                      Lease End Date
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed active:bg-blue-800 text-sm sm:text-base"
                >
                  Update Lease
                </button>
              </>
            )}
          </form>
        </div>

        {/* Lease Status Display */}
        <div>
          {selectedTenantData && (
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900 text-sm sm:text-base">Current Lease Information</h3>
              
              <div className={`p-3 sm:p-4 rounded-lg border ${getStatusColor(selectedTenantData.status)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm sm:text-base">Lease Status</span>
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wide">
                    {selectedTenantData.status}
                  </span>
                </div>
                <div className="text-xs sm:text-sm space-y-1">
                  <div>Start: {new Date(selectedTenantData.leaseStartDate).toLocaleDateString()}</div>
                  <div>End: {new Date(selectedTenantData.leaseEndDate).toLocaleDateString()}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Tenant Details</h4>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <div><span className="font-medium">Name:</span> <span className="truncate">{selectedTenantData.name}</span></div>
                  <div><span className="font-medium">Business:</span> <span className="truncate">{selectedTenantData.businessName}</span></div>
                  <div><span className="font-medium">Cube:</span> {selectedTenantData.cubeId}</div>
                  <div><span className="font-medium">Email:</span> <span className="truncate">{selectedTenantData.email}</span></div>
                  <div><span className="font-medium">Contact:</span> {selectedTenantData.phone}</div>
                </div>
              </div>

              {/* Live Status Calculation */}
              <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2 text-sm sm:text-base">Live Status Check</h4>
                <div className="text-xs sm:text-sm text-blue-700">
                  Current calculated status: <span className="font-semibold">
                    {calculateLeaseStatus(startDate, endDate)}
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-1">
                  Based on today's date: {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* All Tenants Overview */}
      <div className="mt-6 sm:mt-8">
        <h3 className="text-md font-medium text-gray-900 mb-4">All Tenants Lease Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className={`p-3 sm:p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md active:bg-gray-50 ${
                selectedTenant === tenant.id 
                  ? 'ring-2 ring-blue-500 border-blue-300' 
                  : getStatusColor(tenant.status)
              }`}
              onClick={() => handleTenantSelect(tenant.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-gray-900 text-sm sm:text-base truncate flex-1 mr-2">{tenant.name}</div>
                <span className="text-xs font-semibold uppercase tracking-wide flex-shrink-0">
                  {tenant.status}
                </span>
              </div>
              <div className="text-xs sm:text-sm text-gray-600">
                <div className="truncate">{tenant.businessName}</div>
                <div className="mt-1">Cube: {tenant.cubeId}</div>
                <div className="mt-1 text-xs">
                  {new Date(tenant.leaseStartDate).toLocaleDateString()} - {new Date(tenant.leaseEndDate).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LeaseManagement;