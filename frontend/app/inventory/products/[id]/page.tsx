'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Edit,
  Trash2,
  AlertTriangle,
  DollarSign,
  Search,
  User,
  BarChart3,
  X,
  Calendar,
  Tag,
  Eye,
  Clock
} from 'lucide-react';
import { adminProductService, AdminProduct } from '@/services/adminProductService';
import { adminTenantService, AdminTenant } from '@/services/adminTenantService';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTenantStatus, getStatusColorClass, getStatusDisplayText, updateTenantRentalStatuses } from '@/utils/tenantStatus';

export default function TenantProductsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);




  useEffect(() => {
    // Wait for auth to finish loading before checking authentication
    if (authLoading) {
      return;
    }
    
    if (!user) {
      router.push('/auth');
      return;
    }

    const loadTenantProducts = async () => {
      try {
        setLoading(true);
        const tenantId = params.id as string;
        
        // Load tenant details and products
        const [tenantData, productsData] = await Promise.all([
          adminTenantService.getAllTenants(),
          adminProductService.getProducts(tenantId)
        ]);
        
        // Find the specific tenant
        const foundTenant = tenantData.find(t => t.id === tenantId);
        if (!foundTenant) {
          setError('Tenant not found');
          return;
        }
        
        // Update rental statuses dynamically on the frontend
        const updatedTenant = updateTenantRentalStatuses(foundTenant);
        
        // Add calculated status to tenant
        const tenantWithStatus = {
          ...updatedTenant,
          calculatedStatus: calculateTenantStatus({ ...updatedTenant, rentals: updatedTenant.rentals || [] })
        } as unknown as AdminTenant;
        
        setTenant(tenantWithStatus);
        setProducts(productsData);
      } catch (err) {
        console.error('Error loading tenant products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load tenant products');
      } finally {
        setLoading(false);
      }
    };

    loadTenantProducts();
  }, [user, authLoading, params.id, router]);



  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase() || 'PENDING') {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      // case 'MIXED':
      //   return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate aggregated product status based on variants
  const getAggregatedStatus = (product: AdminProduct) => {
    if (!product.variants || product.variants.length === 0) {
      return product.status;
    }

    const variantStatuses = product.variants.map(v => v.status || 'PENDING');
    const uniqueStatuses = Array.from(new Set(variantStatuses));

    if (uniqueStatuses.length === 1) {
      return uniqueStatuses[0];
    }

    // Mixed statuses
    const approvedCount = variantStatuses.filter(s => s === 'APPROVED').length;
    const rejectedCount = variantStatuses.filter(s => s === 'REJECTED').length;
    const pendingCount = variantStatuses.filter(s => s === 'PENDING').length;

    if (approvedCount > 0 && (pendingCount > 0 || rejectedCount > 0)) {
      return 'MIXED';
    }

    return product.status;
  };

  // Get status display text with variant counts
  const getStatusDisplayText = (product: AdminProduct) => {
    const aggregatedStatus = getAggregatedStatus(product);
    
    if (aggregatedStatus === 'MIXED' && product.variants) {
      const approvedCount = product.variants.filter(v => (v.status || 'PENDING') === 'APPROVED').length;
      const totalCount = product.variants.length;
      return `Mixed (${approvedCount}/${totalCount} approved)`;
    }

    return aggregatedStatus;
  };

  // Filter products based on search query (including variants)
  const filteredProducts = products.filter(product => {
    const matchesBasic = product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Also search in variants
    const matchesVariants = product.variants?.some(variant =>
      variant.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      variant.size?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || false;
    
    return matchesBasic || matchesVariants;
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600">Loading product details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tenant Not Found</h3>
            <p className="text-gray-500 mb-4">{error || 'The requested tenant could not be found.'}</p>
            <button
              onClick={() => router.push('/inventory')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                title="Back to inventory"
                onClick={() => router.push('/inventory')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center justify-between w-full">
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                    <User className="w-8 h-8 mr-3 text-blue-600" />
                    {tenant.user.name}
                    <span className={`ml-4 inline-flex items-center px-3 py-1 text-xs rounded-full font-medium ${
                      (() => {
                        const status = tenant.rentals && tenant.rentals.length > 0 ? tenant.rentals[0].status : 'ACTIVE';
                        switch (status) {
                          case 'ACTIVE':
                            return 'bg-green-100 text-green-800';
                          case 'INACTIVE':
                            return 'bg-gray-100 text-gray-800';
                          case 'EXPIRED':
                            return 'bg-red-100 text-red-800';
                          case 'PENDING':
                            return 'bg-yellow-100 text-yellow-800';
                          default:
                            return 'bg-gray-100 text-gray-800';
                        }
                      })()
                    }`}>
                      {tenant.rentals && tenant.rentals.length > 0 ? 
                        tenant.rentals[0].status.replace(/_/g, ' ') : 'ACTIVE'
                      }
                    </span>
                  </h1>
                </div>
                <p className="mt-2 text-gray-600">
                  {tenant.businessName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Stats */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Products</p>
                  <p className="text-2xl font-semibold text-gray-900">{products.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Stock</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {products.reduce((sum, p) => {
                      // Calculate stock from variants if available, otherwise use product stock
                      if (p.variants && p.variants.length > 0) {
                        return sum + p.variants.reduce((variantSum, v) => variantSum + (v.stock || 0), 0);
                      }
                      return sum + (p.stock || 0);
                    }, 0)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Value</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    ${products.reduce((sum, p) => {
                      // Calculate value from variants if available, otherwise use product data
                      if (p.variants && p.variants.length > 0) {
                        return sum + p.variants.reduce((variantSum, v) => variantSum + ((v.price || 0) * (v.stock || 0)), 0);
                      }
                      return sum + ((p.price || 0) * (p.stock || 0));
                    }, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {products.filter(p => {
                      const aggregatedStatus = getAggregatedStatus(p);
                      return aggregatedStatus === 'PENDING' || aggregatedStatus === 'MIXED';
                    }).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="w-1/4 px-8 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="w-24 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="overflow-x-auto max-h-[calc(100vh-450px)] overflow-y-auto">
            <table className="min-w-full table-fixed">
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No products found
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedProduct(product);
                        setShowProductModal(true);
                      }}
                    >
                      <td className="w-1/4 px-8 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                          {/* <div className="text-sm text-gray-500 truncate">{product.description}</div> */}
                        </div>
                      </td>
                      <td className="w-24 px-6 py-4 text-sm font-mono text-gray-900 truncate">
                        {product.sku}
                      </td>
                      <td className="w-32 px-6 py-4 text-sm text-gray-900 truncate">
                        {product.category}
                      </td>
                      <td className="w-28 px-6 py-4 text-sm font-semibold text-green-600">
                        {product.variants && product.variants.length > 0 ? (
                          <div>
                            <div>${product.variants[0].price}</div>
                            {product.variants.length > 1 && (
                              <div className="text-xs text-gray-500">
                                +{product.variants.length - 1} variants
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>${product.price}</div>
                        )}
                      </td>
                      <td className="w-24 px-6 py-4">
                        {product.variants && product.variants.length > 0 ? (
                          <div>
                            {(() => {
                              const totalStock = product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
                              return (
                                <div className="flex items-center">
                                  <span className={`text-sm font-medium ${
                                    totalStock === 0 ? 'text-red-600' :
                                    totalStock <= 5 ? 'text-yellow-600' :
                                    'text-gray-900'
                                  }`}>
                                    {totalStock}
                                  </span>
                                  {totalStock <= 5 && totalStock > 0 && (
                                    <AlertTriangle className="w-4 h-4 text-yellow-500 ml-1" />
                                  )}
                                  {totalStock === 0 && (
                                    <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />
                                  )}
                                </div>
                              );
                            })()} 
                            {product.variants.length > 1 && (
                              <div className="text-xs text-gray-500">
                                {product.variants.length} variants
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <span className={`text-sm font-medium ${
                              (product.stock || 0) === 0 ? 'text-red-600' :
                              (product.stock || 0) <= 5 ? 'text-yellow-600' :
                              'text-gray-900'
                            }`}>
                              {product.stock || 0}
                            </span>
                            {(product.stock || 0) <= 5 && (product.stock || 0) > 0 && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500 ml-1" />
                            )}
                            {(product.stock || 0) === 0 && (
                              <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="w-32 px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(getAggregatedStatus(product))}`}>
                          {getStatusDisplayText(product)}
                        </span>
                      </td>
                      <td className="w-24 px-6 py-4 text-sm font-medium">
                        <button
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setShowProductModal(true);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Variants
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Details Modal */}
        {showProductModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Product Details</h2>
                <button
                  title="Close modal"
                  onClick={() => setShowProductModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6">
                {/* Basic Product Information */}
                <div className="mb-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Product Image */}
                      {(selectedProduct as any).imageUrl ? (
                        <img 
                          src={(selectedProduct as any).imageUrl} 
                          alt={selectedProduct.name}
                          className="w-24 h-24 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="w-12 h-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h3>
                        <p className="text-gray-600 mt-1">{selectedProduct.description}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(getAggregatedStatus(selectedProduct))} flex-shrink-0 ml-4`}>
                      {getStatusDisplayText(selectedProduct)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">SKU</div>
                      <div className="font-mono font-medium">{selectedProduct.sku}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">Category</div>
                      <div className="font-medium">{selectedProduct.category}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">Price</div>
                      <div className="font-semibold text-green-600">${selectedProduct.price}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-500">Stock</div>
                      <div className={`font-medium ${
                        selectedProduct.stock === 0 ? 'text-red-600' :
                        selectedProduct.stock <= 5 ? 'text-yellow-600' :
                        'text-gray-900'
                      }`}>
                        {selectedProduct.stock}
                      </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium">Total Value</div>
                      <div className="font-bold text-blue-700">
                        ${
                          (() => {
                            const baseValue = selectedProduct.price * selectedProduct.stock;
                            const variantValue = selectedProduct.variants?.reduce((sum, variant) => 
                              sum + (variant.price * variant.stock), 0
                            ) || 0;
                            return (baseValue + variantValue).toFixed(2);
                          })()
                        }
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Variants */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Tag className="w-5 h-5 mr-2" />
                      Product Variants
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Color</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedProduct.variants.map((variant) => (
                            <tr key={variant.id}>
                              <td className="px-4 py-2 text-sm text-gray-900">{variant.color}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{variant.size}</td>
                              <td className="px-4 py-2 text-sm font-mono text-gray-900">{variant.sku}</td>
                              <td className="px-4 py-2 text-sm font-semibold text-green-600">${variant.price}</td>
                              <td className="px-4 py-2 text-sm text-gray-900">{variant.stock}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  variant.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                  variant.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {variant.status || 'PENDING'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm font-bold text-blue-600">${(variant.price * variant.stock).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Product Logs */}
                {selectedProduct.logs && selectedProduct.logs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Activity Logs
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedProduct.logs.map((log) => (
                        <div key={log.id} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {log.changeType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            By: {log.user.name}
                          </div>
                          {log.previousValue && (
                            <div className="text-xs text-gray-500">
                              Previous: {log.previousValue}
                            </div>
                          )}
                          <div className="text-xs text-gray-700">
                            New: {log.newValue}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <div className="text-sm text-gray-500">Created At</div>
                    <div className="text-sm text-gray-900">
                      {new Date(selectedProduct.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Updated At</div>
                    <div className="text-sm text-gray-900">
                      {new Date(selectedProduct.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}