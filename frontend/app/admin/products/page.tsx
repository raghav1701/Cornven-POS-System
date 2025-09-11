'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { getRolePermissions } from '@/data/mockAuth';
import { Category } from '@/types/product';
import { adminProductService, AdminProduct } from '@/services/adminProductService';
import { authService } from '@/services/authService';
import { Search, Filter, Package, AlertTriangle, TrendingUp, DollarSign, Users, RefreshCw, Check, X } from 'lucide-react';

const AdminProducts = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [filteredAdminProducts, setFilteredAdminProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<AdminProduct | null>(null);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedVariantForBarcode, setSelectedVariantForBarcode] = useState<any>(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string>('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState('');
  const [barcodeSearchResult, setBarcodeSearchResult] = useState<any>(null);
  const [barcodeSearchLoading, setBarcodeSearchLoading] = useState(false);
  const [variantSearchTerm, setVariantSearchTerm] = useState('');

  // Barcode API functions
  const fetchBarcodeImage = async (variantId: string) => {
    setBarcodeLoading(true);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api` 
        : 'https://cornven.vercel.app/api';

      const response = await fetch(`${baseUrl}/variants/${variantId}/barcode.png`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch barcode image');
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setBarcodeImageUrl(imageUrl);
    } catch (error) {
      console.error('Error fetching barcode:', error);
      alert('Failed to load barcode image');
    } finally {
      setBarcodeLoading(false);
    }
  };

  const searchBarcode = async (barcode: string) => {
    if (!barcode.trim()) return;
    
    setBarcodeSearchLoading(true);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const baseUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/api` 
        : 'https://cornven.vercel.app/api';

      const response = await fetch(`${baseUrl}/variants/lookup?barcode=${encodeURIComponent(barcode)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Barcode not found');
      }

      const result = await response.json();
      setBarcodeSearchResult(result);
    } catch (error) {
      console.error('Error searching barcode:', error);
      setBarcodeSearchResult(null);
      alert('Barcode not found or error occurred');
    } finally {
      setBarcodeSearchLoading(false);
    }
  };

  const handleViewBarcode = (variant: any) => {
    setSelectedVariantForBarcode(variant);
    setShowBarcodeModal(true);
    fetchBarcodeImage(variant.id);
  };

  const closeBarcodeModal = () => {
    setShowBarcodeModal(false);
    setSelectedVariantForBarcode(null);
    setBarcodeImageUrl('');
    setBarcodeSearchTerm('');
    setBarcodeSearchResult(null);
  };

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth');
        return;
      }

      const permissions = getRolePermissions(user.role);
      if (!permissions.includes('admin-products')) {
        router.push('/');
        return;
      }

      setCategories([]);
      
      // Load admin products for approval
      loadAdminProducts();
    }
  }, [user, isLoading, router]);

  const loadAdminProducts = async () => {
    try {
      setLoading(true);
      const adminProductsData = await adminProductService.getProducts(selectedTenantId || undefined);
      
      // If no data from API, use mock data for testing
      if (!adminProductsData || adminProductsData.length === 0) {
        const mockAdminProducts: AdminProduct[] = [
          
        ];
        setAdminProducts(mockAdminProducts);
        setFilteredAdminProducts(mockAdminProducts);
      } else {
        setAdminProducts(adminProductsData);
        setFilteredAdminProducts(adminProductsData);
      }
    } catch (error) {
      console.error('Error loading admin products:', error);
      // Fallback to mock data for testing
      const mockAdminProducts: AdminProduct[] = [
        {
          id: 'admin-1',
          tenantId: 'T001',
          name: 'Handmade Ceramic Mug',
          description: 'Beautiful handcrafted ceramic mug with unique glaze pattern',
          price: 25.99,
          stock: 15,
          category: 'accessories',
          sku: 'MUG-001',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenant: {
            id: 'T001',
            businessName: 'Artisan Crafts Co.'
          },
          logs: []
        },
        {
          id: 'admin-2',
          tenantId: 'T002',
          name: 'Vintage Style Earrings',
          description: 'Elegant vintage-inspired earrings with antique finish',
          price: 18.50,
          stock: 8,
          category: 'earrings',
          sku: 'EAR-002',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenant: {
            id: 'T002',
            businessName: 'Vintage Jewelry Studio'
          },
          logs: []
        }
      ];
      setAdminProducts(mockAdminProducts);
      setFilteredAdminProducts(mockAdminProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (productId: string, approve: boolean) => {
    try {
      setApprovalLoading(productId);
      await adminProductService.approveProduct(productId, approve);
      
      // Reload products after approval
      await loadAdminProducts();
      
      // Show success message
      alert(`Product ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating approval:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} product. Please try again.`);
    } finally {
      setApprovalLoading(null);
    }
  };



  useEffect(() => {
    let filtered = adminProducts;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      const lowercaseQuery = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.sku.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.tenant.businessName.toLowerCase().includes(lowercaseQuery)
      );
    }

    setFilteredAdminProducts(filtered);
  }, [adminProducts, selectedCategory, searchTerm]);

  useEffect(() => {
    if (selectedTenantId) {
      loadAdminProducts();
    }
  }, [selectedTenantId]);



  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase() || 'PENDING') {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVariantStatusCounts = (product: AdminProduct) => {
    // For regular Product type (logs tab), use product status
    if (!('variants' in product) || !product.variants || product.variants.length === 0) {
      return {
        pending: product.status === 'PENDING' ? 1 : 0,
        approved: product.status === 'APPROVED' ? 1 : 0,
        rejected: product.status === 'REJECTED' ? 1 : 0
      };
    }

    // For AdminProduct type (approvals tab), count variant statuses
    return product.variants.reduce(
      (counts: any, variant: any) => {
        if (variant.status === 'PENDING') counts.pending++;
        else if (variant.status === 'APPROVED') counts.approved++;
        else if (variant.status === 'REJECTED') counts.rejected++;
        return counts;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );
  };

  const renderVariantStatusBadges = (product: AdminProduct) => {
    const counts = getVariantStatusCounts(product as AdminProduct);
    
    return (
      <div className="flex flex-wrap gap-1">
        {counts.pending > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
            <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
            {counts.pending}
          </span>
        )}
        {counts.approved > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            {counts.approved}
          </span>
        )}
        {counts.rejected > 0 && (
          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
            {counts.rejected}
          </span>
        )}
      </div>
    );
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600', text: 'Out of Stock' };
    if (stock <= 5) return { color: 'text-yellow-600', text: 'Low Stock' };
    return { color: 'text-green-600', text: 'In Stock' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage inventory, categories, and product listings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Products</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">{adminProducts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Approved</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {adminProducts.filter(p => p.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {adminProducts.filter(p => p.status === 'APPROVED').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {adminProducts.filter(p => p.status === 'PENDING').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Low Stock</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {adminProducts.filter(p => (p.stock || 0) <= 5 && (p.stock || 0) > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Rejected/Out of Stock</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {adminProducts.filter(p => p.status === 'REJECTED' || (p.stock || 0) === 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4">
            {/* Header */}
            <div className="border-b border-gray-200 pb-4">
              <h2 className="text-lg font-medium text-gray-900">Product Approvals</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  aria-label="Filter by category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name} ({filteredAdminProducts.filter(p => p.category === category.name).length})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Tenant</label>
                <input
                  type="text"
                  placeholder="Enter Tenant ID (optional)"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, SKU, or tenant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => loadAdminProducts()}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh Approvals
              </button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Product Approvals ({filteredAdminProducts.length} items)
            </h3>
          </div>
          
          {filteredAdminProducts.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAdminProducts.map((product) => (
                        <tr 
                          key={product.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/admin/products/${product.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.variants && product.variants.length > 0 ? (
                                <div>
                                  <div className="font-medium mb-2">{product.variants.length} variant(s)</div>
                                  <div className="space-y-1">
                                    {product.variants.slice(0, 2).map((variant, idx) => (
                                      <div key={idx} className="flex items-center space-x-2">
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                          {variant.color}
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                          {variant.size}
                                        </span>
                                        <span className="text-xs font-semibold text-green-600">
                                          ${(variant.price || 0).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({variant.stock || 0} units)
                                        </span>
                                      </div>
                                    ))}
                                    {product.variants.length > 2 && (
                                      <div className="text-blue-600 text-xs font-medium">+{product.variants.length - 2} more variants</div>
                                    )}
                                  </div>
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium">Total Stock: </span>
                                      <span className="font-semibold text-gray-900">
                                        {product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)} units
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      <span className="font-medium">Total Value: </span>
                                      <span className="font-semibold text-green-600">
                                        ${product.variants.reduce((sum, v) => sum + ((v.price || 0) * (v.stock || 0)), 0).toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium mb-1">Base Product</div>
                                  <div className="text-xs text-gray-600">
                                    <span className="font-semibold text-green-600">${(product.price || 0).toFixed(2)}</span>
                                    <span className="text-gray-500 ml-2">({product.stock || 0} units)</span>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">Total Value: </span>
                                    <span className="font-semibold text-green-600">
                                      ${((product.price || 0) * (product.stock || 0)).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.tenant.businessName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {renderVariantStatusBadges(product)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {product.status === 'PENDING' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproval(product.id, true);
                                }}
                                disabled={approvalLoading === product.id}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {approvalLoading === product.id ? (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                ) : (
                                  <Check className="w-3 h-3 mr-1" />
                                )}
                                Approve
                              </button>
                            ) : (
                              <span className="text-gray-500 text-xs">
                                {product.status === 'APPROVED' ? 'Already Approved' : 'Already Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Cards for Admin Products */}
                <div className="lg:hidden">
                  {filteredAdminProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="border-b border-gray-200 p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedProductForModal(product);
                        setShowVariantModal(true);
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{product.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {product.category}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-2">Variants & Stock</p>
                          <div className="text-xs">
                            {product.variants && product.variants.length > 0 ? (
                              <div className="space-y-2">
                                <div className="font-medium text-gray-900 mb-1">
                                  {product.variants.length} variant(s)
                                </div>
                                {product.variants.slice(0, 2).map((variant, index) => (
                                  <div key={index} className="flex flex-wrap items-center gap-1 mb-1">
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                      {variant.color}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                      {variant.size}
                                    </span>
                                    <span className="text-xs font-semibold text-green-600">
                                      ${(variant.price || 0).toFixed(2)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      ({variant.stock || 0})
                                    </span>
                                  </div>
                                ))}
                                {product.variants.length > 2 && (
                                  <div className="text-blue-600 font-medium">+{product.variants.length - 2} more</div>
                                )}
                                <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                                  <div className="text-gray-600">
                                    <span className="font-medium">Total Stock: </span>
                                    <span className="font-semibold text-gray-900">
                                      {product.variants.reduce((sum, v) => sum + (v.stock || 0), 0)}
                                    </span>
                                  </div>
                                  <div className="text-gray-600">
                                    <span className="font-medium">Total Value: </span>
                                    <span className="font-semibold text-green-600">
                                      ${product.variants.reduce((sum, v) => sum + ((v.price || 0) * (v.stock || 0)), 0).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-medium text-gray-900 mb-1">Base Product</div>
                                <div className="text-gray-600">
                                  <span className="font-semibold text-green-600">${(product.price || 0).toFixed(2)}</span>
                                  <span className="text-gray-500 ml-2">({product.stock || 0} units)</span>
                                </div>
                                <div className="text-gray-600 mt-1">
                                  <span className="font-medium">Total Value: </span>
                                  <span className="font-semibold text-green-600">
                                    ${((product.price || 0) * (product.stock || 0)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Tenant</p>
                          <p className="text-sm text-gray-900 truncate">{product.tenant.businessName}</p>
                        </div>
                      </div>
                      
                      {product.status === 'PENDING' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproval(product.id, true);
                          }}
                          disabled={approvalLoading === product.id}
                          className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {approvalLoading === product.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </button>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-sm">
                            {product.status === 'APPROVED' ? 'Already Approved' : 'Already Rejected'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products pending approval</h3>
              <p className="mt-1 text-sm text-gray-500">
                {loading ? 'Loading products...' : 'All products have been reviewed or no products match your filters.'}
              </p>
            </div>
          )
        }
        </div>
      </div>


      
      {/* Variant Details Modal */}
      {showVariantModal && selectedProductForModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProductForModal.name}</h2>
                  <p className="text-gray-600 mt-1">{selectedProductForModal.description}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-sm text-gray-500">SKU: {selectedProductForModal.sku}</span>
                    <span className="text-sm text-gray-500">Category: {selectedProductForModal.category}</span>
                    <span className="text-sm text-gray-500">Tenant: {selectedProductForModal.tenant?.businessName}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowVariantModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {/* Product Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Status</h3>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    selectedProductForModal.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    selectedProductForModal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedProductForModal.status}
                  </span>
                  <span className="text-sm text-gray-500">
                    Created: {new Date(selectedProductForModal.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Updated: {new Date(selectedProductForModal.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {/* Variants */}
              {selectedProductForModal.variants && selectedProductForModal.variants.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Product Variants ({selectedProductForModal.variants.length})</h3>
                  </div>
                  
                  {/* Variant Search Bar */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={variantSearchTerm}
                      onChange={(e) => setVariantSearchTerm(e.target.value)}
                      placeholder="Search variants by color, size, SKU, or barcode..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProductForModal.variants
                      .filter((variant) => {
                        if (!variantSearchTerm) return true;
                        const searchLower = variantSearchTerm.toLowerCase();
                        return (
                          variant.color?.toLowerCase().includes(searchLower) ||
                          variant.size?.toLowerCase().includes(searchLower) ||
                          variant.sku?.toLowerCase().includes(searchLower) ||
                          variant.barcode?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((variant) => (
                      <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex flex-wrap gap-2">
                            {variant.color && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {variant.color}
                              </span>
                            )}
                            {variant.size && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {variant.size}
                              </span>
                            )}
                          </div>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            variant.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            variant.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {variant.status}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Price:</span>
                            <span className="text-sm font-medium text-green-600">${variant.price?.toFixed(2) || '0.00'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Stock:</span>
                            <span className={`text-sm font-medium ${
                              (variant.stock || 0) <= 5 ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {variant.stock || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">SKU:</span>
                            <span className="text-sm text-gray-900">{variant.sku}</span>
                          </div>
                          {variant.barcode && (
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Barcode:</span>
                              <span className="text-sm text-gray-900">{variant.barcode}</span>
                            </div>
                          )}
                          <div className="border-t pt-2 mt-2">
                            <div className="flex justify-between mb-2">
                              <span className="text-sm text-gray-600">Total Value:</span>
                              <span className="text-sm font-medium text-green-600">
                                ${((variant.price || 0) * (variant.stock || 0)).toFixed(2)}
                              </span>
                            </div>
                            {variant.barcode && (
                              <button
                                onClick={() => handleViewBarcode(variant)}
                                className="w-full mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                              >
                                View Barcode
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Total Variants:</span>
                        <div className="text-lg font-semibold text-gray-900">{selectedProductForModal.variants.length}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Total Stock:</span>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedProductForModal.variants.reduce((sum, v) => sum + (v.stock || 0), 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Total Value:</span>
                        <div className="text-lg font-semibold text-green-600">
                          ${selectedProductForModal.variants.reduce((sum, v) => sum + ((v.price || 0) * (v.stock || 0)), 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Avg. Price:</span>
                        <div className="text-lg font-semibold text-gray-900">
                          ${(selectedProductForModal.variants.reduce((sum, v) => sum + (v.price || 0), 0) / selectedProductForModal.variants.length).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Base Product Details */
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Price:</span>
                        <div className="text-lg font-semibold text-green-600">${selectedProductForModal.price?.toFixed(2) || '0.00'}</div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Stock:</span>
                        <div className={`text-lg font-semibold ${
                          (selectedProductForModal.stock || 0) <= 5 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {selectedProductForModal.stock || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Total Value:</span>
                        <div className="text-lg font-semibold text-green-600">
                          ${((selectedProductForModal.price || 0) * (selectedProductForModal.stock || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Close Button */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowVariantModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {showBarcodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Barcode Details</h2>
              <button
                title="Close modal"
                onClick={closeBarcodeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Barcode Lookup Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Barcode Lookup</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeSearchTerm}
                  onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                  placeholder="Enter barcode to search"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => searchBarcode(barcodeSearchTerm)}
                  disabled={barcodeSearchLoading || !barcodeSearchTerm.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {barcodeSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {/* Search Results */}
              {barcodeSearchResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Search Result:</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Product:</span> {barcodeSearchResult.productName}</p>
                    <p><span className="font-medium">Category:</span> {barcodeSearchResult.category}</p>
                    <p><span className="font-medium">Color:</span> {barcodeSearchResult.color}</p>
                    <p><span className="font-medium">Size:</span> {barcodeSearchResult.size}</p>
                    <p><span className="font-medium">Price:</span> ${barcodeSearchResult.price}</p>
                    <p><span className="font-medium">Stock:</span> {barcodeSearchResult.stock}</p>
                    <p><span className="font-medium">Tenant:</span> {barcodeSearchResult.tenant?.businessName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Variant Details */}
            {selectedVariantForBarcode && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Variant</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2 text-sm">
                    <div className="flex gap-2 mb-2">
                      {selectedVariantForBarcode.color && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {selectedVariantForBarcode.color}
                        </span>
                      )}
                      {selectedVariantForBarcode.size && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {selectedVariantForBarcode.size}
                        </span>
                      )}
                    </div>
                    <p><span className="font-medium">Price:</span> ${selectedVariantForBarcode.price?.toFixed(2) || '0.00'}</p>
                    <p><span className="font-medium">Stock:</span> {selectedVariantForBarcode.stock || 0}</p>
                    <p><span className="font-medium">SKU:</span> {selectedVariantForBarcode.sku}</p>
                    <p><span className="font-medium">Barcode:</span> {selectedVariantForBarcode.barcode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Barcode Image */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Barcode Image</h3>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                {barcodeLoading ? (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading barcode...</p>
                  </div>
                ) : barcodeImageUrl ? (
                  <img
                    src={barcodeImageUrl}
                    alt="Barcode"
                    className="max-w-full h-auto mx-auto"
                  />
                ) : (
                  <p className="text-gray-600 py-8">No barcode image available</p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={closeBarcodeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Modal */}
      {showBarcodeModal && selectedVariantForBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Barcode Details</h2>
              <button
                title="Close modal"
                onClick={closeBarcodeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Barcode Lookup Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Barcode Lookup</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={barcodeSearchTerm}
                  onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                  placeholder="Enter barcode to search"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => searchBarcode(barcodeSearchTerm)}
                  disabled={barcodeSearchLoading || !barcodeSearchTerm.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {barcodeSearchLoading ? 'Searching...' : 'Search'}
                </button>
              </div>
              
              {/* Search Results */}
              {barcodeSearchResult && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Search Result:</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Product:</span> {barcodeSearchResult.productName}</p>
                    <p><span className="font-medium">Category:</span> {barcodeSearchResult.category}</p>
                    <p><span className="font-medium">Color:</span> {barcodeSearchResult.color}</p>
                    <p><span className="font-medium">Size:</span> {barcodeSearchResult.size}</p>
                    <p><span className="font-medium">Price:</span> ${barcodeSearchResult.price}</p>
                    <p><span className="font-medium">Stock:</span> {barcodeSearchResult.stock}</p>
                    <p><span className="font-medium">Tenant:</span> {barcodeSearchResult.tenant?.businessName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Variant Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Variant</h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex gap-2 mb-2">
                    {selectedVariantForBarcode.color && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {selectedVariantForBarcode.color}
                      </span>
                    )}
                    {selectedVariantForBarcode.size && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {selectedVariantForBarcode.size}
                      </span>
                    )}
                  </div>
                  <p><span className="font-medium">Price:</span> ${selectedVariantForBarcode.price?.toFixed(2) || '0.00'}</p>
                  <p><span className="font-medium">Stock:</span> {selectedVariantForBarcode.stock || 0}</p>
                  <p><span className="font-medium">SKU:</span> {selectedVariantForBarcode.sku}</p>
                  <p><span className="font-medium">Barcode:</span> {selectedVariantForBarcode.barcode}</p>
                </div>
              </div>
            </div>

            {/* Barcode Image */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Barcode Image</h3>
              <div className="border border-gray-200 rounded-lg p-4 text-center">
                {barcodeLoading ? (
                  <div className="py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Loading barcode...</p>
                  </div>
                ) : barcodeImageUrl ? (
                  <img
                    src={barcodeImageUrl}
                    alt="Barcode"
                    className="max-w-full h-auto mx-auto"
                  />
                ) : (
                  <p className="text-gray-500 py-8">Failed to load barcode image</p>
                )}
              </div>
            </div>

            {/* Close Button */}
            <div className="flex justify-end">
              <button
                onClick={closeBarcodeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;