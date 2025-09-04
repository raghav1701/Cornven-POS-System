'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { getRolePermissions } from '@/data/mockAuth';
import { adminProductService, AdminProduct } from '@/services/adminProductService';
import { ArrowLeft, Package, Calendar, User, Building, Tag, DollarSign, Hash, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const ProductDetail = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [variantApprovalLoading, setVariantApprovalLoading] = useState<{[key: string]: boolean}>({});

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

      loadProductDetails();
    }
  }, [user, isLoading, router, productId]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll fetch all products and find the specific one
      // In a real implementation, you'd have a specific endpoint for single product
      const products = await adminProductService.getProducts();
      const foundProduct = products.find(p => p.id === productId);
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        setError('Product not found');
      }
    } catch (error) {
      console.error('Error loading product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approve: boolean) => {
    if (!product) return;
    
    try {
      setApprovalLoading(true);
      await adminProductService.approveProduct(product.id, approve);
      
      // Reload product detailss
      await loadProductDetails();
      
      // Show success message
      alert(`Product ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating approval.:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} product. Please try again.`);
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleVariantApproval = async (variantId: string, approve: boolean) => {
    if (!product) return;
    
    try {
      setVariantApprovalLoading(prev => ({ ...prev, [variantId]: true }));
      const updatedVariant = await adminProductService.approveVariant(product.id, variantId, approve);
      
      // Update the local product state with the new variant status
      setProduct(prevProduct => {
        if (!prevProduct) return prevProduct;
        
        const updatedVariants = prevProduct.variants?.map(variant => 
          variant.id === variantId 
            ? { ...variant, status: updatedVariant.status, updatedAt: updatedVariant.updatedAt }
            : variant
        );
        
        return { ...prevProduct, variants: updatedVariants };
      });
      
      // Show success message
      alert(`Variant ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating variant approval:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} variant. Please try again.`);
    } finally {
      setVariantApprovalLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase() || 'PENDING') {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toUpperCase() || 'PENDING') {
      case 'PENDING': return <AlertCircle className="w-4 h-4" />;
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'REJECTED': return <XCircle className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading product...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error}</p>
            <button
              onClick={() => router.push('/admin/products')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Product not found</h3>
            <p className="mt-1 text-sm text-gray-500">The product you're looking for doesn't exist.</p>
            <button
              onClick={() => router.push('/admin/products')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/products')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Products
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-gray-600 mt-1">Product Details & Management</p>
            </div>
            <div className="flex items-center space-x-2">
              {(() => {
                if (!product.variants || product.variants.length === 0) {
                  return (
                    <>
                      {getStatusIcon(product.status)}
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(product.status)}`}>
                        {product.status}
                      </span>
                    </>
                  );
                }
                
                const pendingCount = product.variants.filter(v => v.status === 'PENDING').length;
                const approvedCount = product.variants.filter(v => v.status === 'APPROVED').length;
                const totalCount = product.variants.length;
                
                let overallStatus = 'MIXED';
                let statusIcon = <AlertCircle className="w-4 h-4" />;
                let statusColor = 'bg-gray-100 text-gray-800';
                
                if (pendingCount === totalCount) {
                  overallStatus = 'ALL PENDING';
                  statusIcon = <AlertCircle className="w-4 h-4" />;
                  statusColor = 'bg-yellow-100 text-yellow-800';
                } else if (approvedCount === totalCount) {
                  overallStatus = 'ALL APPROVED';
                  statusIcon = <CheckCircle className="w-4 h-4" />;
                  statusColor = 'bg-green-100 text-green-800';
                } else if (pendingCount === 0) {
                  overallStatus = 'PROCESSED';
                  statusIcon = <CheckCircle className="w-4 h-4" />;
                  statusColor = 'bg-blue-100 text-blue-800';
                }
                
                return (
                  <>
                    {statusIcon}
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColor}`}>
                      {overallStatus}
                    </span>
                    <span className="text-xs text-gray-500">({approvedCount}/{totalCount} approved)</span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Product Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
              
              {/* Product Image */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Package className="w-4 h-4 inline mr-1" />
                  Product Image
                </label>
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                    <Package className="w-16 h-16 text-gray-400" />
                    <span className="sr-only">No image available</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    Product Name
                  </label>
                  <p className="text-sm text-gray-900">{product.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Hash className="w-4 h-4 inline mr-1" />
                    SKU
                  </label>
                  <p className="text-sm text-gray-900 font-mono">{product.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Category
                  </label>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {product.category}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Price
                  </label>
                  <p className="text-sm text-gray-900 font-semibold">${(product.price || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Package className="w-4 h-4 inline mr-1" />
                    Stock
                  </label>
                  <p className="text-sm text-gray-900">{product.stock} units</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building className="w-4 h-4 inline mr-1" />
                    Tenant
                  </label>
                  <p className="text-sm text-gray-900">{product.tenant.businessName}</p>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Description
                </label>
                <p className="text-sm text-gray-900">{product.description}</p>
              </div>
            </div>

            {/* Product Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  <Tag className="w-5 h-5 inline mr-2" />
                  Product Variants
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.variants.map((variant, index) => (
                        <tr key={variant.id || index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{variant.color}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{variant.size}</td>
                          <td className="px-4 py-2 text-sm font-semibold text-green-600">${variant.price}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{variant.stock}</td>
                          <td className="px-4 py-2">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(variant.status)}
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(variant.status)}`}>
                                {variant.status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            {variant.status === 'PENDING' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleVariantApproval(variant.id, true)}
                                  disabled={variantApprovalLoading[variant.id]}
                                  title="Approve this variant"
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                  {variantApprovalLoading[variant.id] ? (
                                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                  ) : (
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                  )}
                                  {variantApprovalLoading[variant.id] ? 'Approving...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleVariantApproval(variant.id, false)}
                                  disabled={variantApprovalLoading[variant.id]}
                                  title="Reject this variant"
                                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                  {variantApprovalLoading[variant.id] ? (
                                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></div>
                                  ) : (
                                    <XCircle className="w-3 h-3 mr-1" />
                                  )}
                                  {variantApprovalLoading[variant.id] ? 'Rejecting...' : 'Reject'}
                                </button>
                              </div>
                            )}
                            {variant.status === 'APPROVED' && (
                              <div className="flex items-center text-xs text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approved
                              </div>
                            )}
                            {variant.status === 'REJECTED' && (
                              <div className="flex items-center text-xs text-red-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Product Logs */}
            {product.logs && product.logs.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Product History</h2>
                <div className="space-y-4">
                  {product.logs.map((log) => (
                    <div key={log.id} className="border-l-4 border-blue-200 pl-4 py-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{log.changeType}</p>
                          <p className="text-xs text-gray-500">by {log.user.name}</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {log.previousValue && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Previous: </span>
                          <span className="text-gray-700">{log.previousValue}</span>
                        </div>
                      )}
                      {log.newValue && (
                        <div className="text-xs">
                          <span className="text-gray-500">New: </span>
                          <span className="text-gray-700">{log.newValue}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Variant Status Summary */}
            {product.variants && product.variants.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Variant Status Summary</h2>
                <div className="space-y-2">
                  {(() => {
                    const pendingCount = product.variants.filter(v => v.status === 'PENDING').length;
                    const approvedCount = product.variants.filter(v => v.status === 'APPROVED').length;
                    const rejectedCount = product.variants.filter(v => v.status === 'REJECTED').length;
                    
                    return (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pending:</span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            {pendingCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Approved:</span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {approvedCount}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Rejected:</span>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            {rejectedCount}
                          </span>
                        </div>
                        {pendingCount > 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 rounded-md">
                            <p className="text-xs text-yellow-800">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              {pendingCount} variant{pendingCount > 1 ? 's' : ''} pending approval
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()} 
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Created At
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(product.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Last Updated
                  </label>
                  <p className="text-sm text-gray-900">
                    {new Date(product.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Product ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono break-all">{product.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building className="w-4 h-4 inline mr-1" />
                    Tenant ID
                  </label>
                  <p className="text-sm text-gray-900 font-mono break-all">{product.tenantId}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;