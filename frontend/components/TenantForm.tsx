'use client';

import { useState, useEffect } from 'react';
import { Tenant, TenantFormData } from '@/types/tenant';
import { tenantService, AvailableCube } from '@/services/tenantService';

interface CubeAllocationData {
  tenantId: string;
  cubeId: string;
  startDate: string;
  endDate: string;
}

interface TenantFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenant: Tenant) => void;
  editingTenant?: Tenant | null;
}

const TenantForm = ({ isOpen, onClose, onSubmit, editingTenant }: TenantFormProps) => {
  const [formData, setFormData] = useState<TenantFormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    businessName: '',
    address: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<TenantFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  
  // Multi-step state
  const [currentStep, setCurrentStep] = useState<'form' | 'loading' | 'cubePrompt' | 'cubeSelection'>('form');
  const [createdTenantId, setCreatedTenantId] = useState<string>('');
  
  // Cube selection state
  const [availableCubes, setAvailableCubes] = useState<AvailableCube[]>([]);
  const [selectedCube, setSelectedCube] = useState<string>('');
  const [leaseStartDate, setLeaseStartDate] = useState<string>('');
  const [leaseEndDate, setLeaseEndDate] = useState<string>('');
  const [isAllocatingCube, setIsAllocatingCube] = useState(false);
  const [isLoadingCubes, setIsLoadingCubes] = useState(false);

  useEffect(() => {
    if (editingTenant) {
      setFormData({
        name: editingTenant.name,
        email: editingTenant.email,
        password: '', // Don't pre-fill password for editing
        phone: editingTenant.phone || '',
        businessName: editingTenant.businessName,
        address: editingTenant.address || '',
        notes: editingTenant.notes || '',
      });
    } else {
      resetForm();
    }
  }, [editingTenant, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<TenantFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!editingTenant && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!tenantService.validatePhoneNumber(formData.phone)) {
      newErrors.phone = 'Please enter a valid Australian phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof TenantFormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setNotification({
        type: 'error',
        message: 'Please fix the errors above and try again.'
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      if (editingTenant) {
        // Handle editing existing tenant
        const updatedTenant: Tenant = {
          ...editingTenant,
          name: formData.name,
          email: formData.email,
          businessName: formData.businessName,
          phone: tenantService.formatPhoneNumber(formData.phone),
          address: formData.address,
          notes: formData.notes,
        };

        onSubmit(updatedTenant);
        setNotification({
          type: 'success',
          message: 'Tenant updated successfully!'
        });
        
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1500);
      } else {
        // Handle creating new tenant
        setCurrentStep('loading');

        // Prepare data for API
        const apiData = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: tenantService.formatPhoneNumber(formData.phone),
          businessName: formData.businessName,
          address: formData.address,
          notes: formData.notes || ''
        };

        // Double-check required fields before sending
        if (!apiData.name || !apiData.email || !apiData.password || !apiData.phone || !apiData.businessName || !apiData.address) {
          throw new Error('Missing required fields. Please fill in all required fields.');
        }

        const response = await tenantService.addTenant(apiData);
        
        if (response.success && response.data?.tenantId) {
          setCreatedTenantId(response.data.tenantId);
          setCurrentStep('cubePrompt');
        } else {
          throw new Error(response.message || 'Failed to create tenant');
        }
      }
    } catch (error) {
      console.error('Error submitting tenant:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'
      });
      
      if (!editingTenant) {
        setCurrentStep('form');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipCubeSelection = () => {
    // Create tenant object without cube allocation
    const newTenant = createTenantObject();
    onSubmit(newTenant);
    
    setNotification({
      type: 'success',
      message: 'Tenant created successfully!'
    });
    
    setTimeout(() => {
      onClose();
      resetForm();
    }, 1500);
  };

  const loadAvailableCubes = async () => {
    setIsLoadingCubes(true);
    try {
      const cubes = await tenantService.viewAvailableCubes();
      setAvailableCubes(cubes);
    } catch (error) {
      console.error('Error loading available cubes:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load available cubes. Please try again.'
      });
    } finally {
      setIsLoadingCubes(false);
    }
  };

  const handleProceedToCubeSelection = async () => {
    setCurrentStep('cubeSelection');
    await loadAvailableCubes();
  };

  // Helper function to create tenant object for parent component
  const createTenantObject = (): Tenant => {
    return {
      id: createdTenantId,
      name: formData.name,
      email: formData.email,
      businessName: formData.businessName,
      phone: tenantService.formatPhoneNumber(formData.phone),
      address: formData.address,
      notes: formData.notes,
      cubeId: selectedCube || '',
      leaseStartDate: leaseStartDate || '',
      leaseEndDate: leaseEndDate || '',
      rentPayments: [],
      dailyRent: 0,
      securityDeposit: 0,
      status: 'Active'
    };
  };

  const handleCubeAllocation = async () => {
    if (!selectedCube || !leaseStartDate || !leaseEndDate) {
      setNotification({
        type: 'error',
        message: 'Please select a cube and set lease dates.'
      });
      return;
    }

    if (new Date(leaseEndDate) <= new Date(leaseStartDate)) {
      setNotification({
        type: 'error',
        message: 'End date must be after start date.'
      });
      return;
    }

    setIsAllocatingCube(true);
    setNotification(null);

    try {
      const allocationData: CubeAllocationData = {
        tenantId: createdTenantId,
        cubeId: selectedCube,
        startDate: leaseStartDate,
        endDate: leaseEndDate
      };

      const response = await tenantService.allocateCube(allocationData);
      
      if (response.success) {
        // Create tenant object with cube allocation
        const newTenant = createTenantObject();
        onSubmit(newTenant);
        
        setNotification({
          type: 'success',
          message: 'Tenant created and cube allocated successfully!'
        });
        
        setTimeout(() => {
          onClose();
          resetForm();
        }, 1500);
      } else {
        throw new Error(response.message || 'Failed to allocate cube');
      }
    } catch (error) {
      console.error('Error allocating cube:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to allocate cube. Please try again.'
      });
    } finally {
      setIsAllocatingCube(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      businessName: '',
      phone: '',
      address: '',
      notes: ''
    });
    setCurrentStep('form');
    setCreatedTenantId('');
    setSelectedCube('');
    setLeaseStartDate('');
    setLeaseEndDate('');
    setNotification(null);
    setErrors({});
  };

  if (!isOpen) return null;

  const getModalTitle = () => {
    switch (currentStep) {
      case 'loading':
        return 'Processing...';
      case 'cubePrompt':
        return 'Cube Selection';
      case 'cubeSelection':
        return 'Select Cube';
      default:
        return editingTenant ? 'Edit Tenant' : 'Add New Tenant';
    }
  };

  const getModalWidth = () => {
    return currentStep === 'cubeSelection' ? 'max-w-2xl' : 'max-w-md';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl ${getModalWidth()} w-full max-h-[90vh] flex flex-col`}>
        {/* Fixed Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {getModalTitle()}
            </h2>
            <button
              onClick={currentStep === 'form' ? onClose : handleSkipCubeSelection}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Tenant Form */}
            {currentStep === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Enter tenant full name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="Enter email address"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`input-field ${errors.password ? 'border-red-500' : ''}`}
                    placeholder="Enter password (e.g., Tenant@1234)"
                  />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    className={`input-field ${errors.businessName ? 'border-red-500' : ''}`}
                    placeholder="Enter business name"
                  />
                  {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                     Social Profile URL /  Link
                  </label>
                  <input
                    type="text"
                    id=""
                    name=""
                    className={`input-field ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="paste the link here"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`input-field ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="e.g., 0400123456 or +61400123456"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address *
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`input-field ${errors.address ? 'border-red-500' : ''}`}
                    placeholder="Enter full address"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Additional notes about the tenant (optional)"
                  />
                </div>

                {notification && (
                  <div className={`border rounded-md p-3 ${
                    notification.type === 'success' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      notification.type === 'success' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isLoading && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isLoading 
                      ? (editingTenant ? 'Updating...' : 'Adding...') 
                      : (editingTenant ? 'Update Tenant' : 'Add Tenant')
                    }
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Loading */}
            {currentStep === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-lg font-medium text-gray-900 mb-2">Creating tenant...</p>
                <p className="text-sm text-gray-600">Please wait while we process your request</p>
              </div>
            )}

            {/* Step 3: Cube Selection Prompt */}
            {currentStep === 'cubePrompt' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                      <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Tenant created successfully!
                    </h3>
                  </div>
                  
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Do you want to select a cube rental for this tenant?
                  </p>
                  <p className="text-sm text-gray-600 mb-8">
                    You can assign a cube and set lease dates now, or skip this step and do it later.
                  </p>
                </div>

                <div className="flex justify-center space-x-4">
                  <button
                    type="button"
                    onClick={handleSkipCubeSelection}
                    className="btn-secondary px-6"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedToCubeSelection}
                    className="btn-primary px-6"
                  >
                    Yes, select cube
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Cube Selection */}
            {currentStep === 'cubeSelection' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Available Cubes
                  </label>
                  
                  {isLoadingCubes ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-gray-600">Loading available cubes...</span>
                    </div>
                  ) : availableCubes.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600">No available cubes found.</p>
                      <button
                        type="button"
                        onClick={loadAvailableCubes}
                        className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Retry loading cubes
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {availableCubes.map((cube) => (
                        <div
                          key={cube.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            selectedCube === cube.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedCube(cube.id)}
                        >
                          <div className="flex items-start">
                            <input
                              type="radio"
                              name="cube"
                              value={cube.id}
                              checked={selectedCube === cube.id}
                              onChange={() => setSelectedCube(cube.id)}
                              className="mr-3 mt-1"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">{cube.code}</h4>
                              <p className="text-xs text-gray-600">Size: {cube.size}</p>
                              <p className="text-xs text-gray-600">Price: ${cube.pricePerDay}/day</p>
                              <p className="text-xs text-gray-500">Status: {cube.status}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCube && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="leaseStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease Start Date *
                      </label>
                      <input
                        type="date"
                        id="leaseStartDate"
                        value={leaseStartDate}
                        onChange={(e) => setLeaseStartDate(e.target.value)}
                        className="input-field"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>

                    <div>
                      <label htmlFor="leaseEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Lease End Date *
                      </label>
                      <input
                        type="date"
                        id="leaseEndDate"
                        value={leaseEndDate}
                        onChange={(e) => setLeaseEndDate(e.target.value)}
                        className="input-field"
                        min={leaseStartDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                )}

                {notification && (
                  <div className={`border rounded-md p-3 ${
                    notification.type === 'success' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm ${
                      notification.type === 'success' 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {notification.message}
                    </p>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleSkipCubeSelection}
                    className="btn-secondary"
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={handleCubeAllocation}
                    disabled={isAllocatingCube || !selectedCube || !leaseStartDate || !leaseEndDate}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isAllocatingCube && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isAllocatingCube ? 'Allocating...' : 'Allocate Cube'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
   
  );
};

export default TenantForm;