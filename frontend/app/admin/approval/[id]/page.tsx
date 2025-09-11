'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { getRolePermissions } from '@/data/mockAuth';
import { adminProductService, AdminProduct } from '@/services/adminProductService';
import { tenantPortalService } from '@/services/tenantPortalService';
import { ArrowLeft, Package, Calendar, User, Building, Tag, DollarSign, Hash, FileText, Clock, CheckCircle, XCircle, AlertCircle, Image as ImageIcon } from 'lucide-react';

const ProductApprovalDetail = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [variantApprovalLoading, setVariantApprovalLoading] = useState<{[key: string]: boolean}>({});
  const [variantImages, setVariantImages] = useState<Record<string, string>>({});
  const [variantImageLoading, setVariantImageLoading] = useState<Record<string, boolean>>({});

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
      
      const products = await adminProductService.getProducts();
      const foundProduct = products.find(p => p.id === productId);
      
      if (foundProduct) {
        setProduct(foundProduct);
        // Load variant images
        if (foundProduct.variants) {
          foundProduct.variants.forEach(variant => {
            fetchVariantImage(variant.id);
          });
        }
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

  const fetchVariantImage = async (variantId: string) => {
    if (variantImages[variantId] || variantImageLoading[variantId]) {
      return;
    }

    setVariantImageLoading(prev => ({ ...prev, [variantId]: true }));
    try {
      const response = await tenantPortalService.getVariantImageUrlSafe(variantId);
      if (response && response.url) {
        setVariantImages(prev => ({ ...prev, [variantId]: response.url }));
      } else {
        setVariantImages(prev => ({ ...prev, [variantId]: 'No image' }));
      }
    } catch (error) {
      console.error('Error fetching variant image:', error);
      setVariantImages(prev => ({ ...prev, [variantId]: '' }));
    } finally {
      setVariantImageLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  const handleApproval = async (approve: boolean) => {
    if (!product) return;
    
    try {
      setApprovalLoading(true);
      await adminProductService.approveProduct(product.id, approve);
      
      await loadProductDetails();
      
      alert(`Product ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating approval:', error);
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
      
      setProduct(prevProduct => {
        if (!prevProduct) return prevProduct;
        
        const updatedVariants = prevProduct.variants?.map(variant => 
          variant.id === variantId 
            ? { ...variant, status: updatedVariant.status, updatedAt: updatedVariant.updatedAt }
            : variant
        );
        
        return { ...prevProduct, variants: updatedVariants };
      });
      
      alert(`Variant ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating variant approval:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} variant. Please try again.`);
    } finally {
      setVariantApprovalLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'APPROVED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading product details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <XCircle className="mx-auto h-12 w-12 text-red-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error</h3>
            <p className="mt-1 text-sm text-gray-500">{error || 'Product not found'}</p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/admin/products')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </button>
            </div>
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
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Product Approvals
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Product Approval Details</h1>
              <p className="text-gray-600 mt-2">Review and approve product information</p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(product.status)}
              <span className={getStatusBadge(product.status)}>
                {product.status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Product Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Basic Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{product.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-sm text-gray-900">{product.category || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">SKU</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{product.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Base Price</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">${product.price.toFixed(2)}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-sm text-gray-900">{product.description || 'No description provided'}</p>
                </div>
              </div>
            </div>

            {/* Tenant Information Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Tenant Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Business Name</label>
                  <p className="mt-1 text-sm text-gray-900 font-semibold">{product.tenant.businessName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">{product.tenant.id}</p>
                </div>
              </div>
            </div>

            {/* Product Variants */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Tag className="w-5 h-5 mr-2" />
                Product Variants ({product.variants?.length || 0})
              </h2>
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-4">
                  {product.variants.map((variant) => (
                    <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Variant Image */}
                          <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                            <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                              {variantImageLoading[variant.id] ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              ) : variantImages[variant.id] && variantImages[variant.id] !== 'No image' && variantImages[variant.id] !== '' ? (
                                <img
                                  src={variantImages[variant.id]}
                                  alt={`${variant.color} ${variant.size}`}
                                  className="w-full h-full object-cover rounded-lg"
                                  onError={(e) => {
                                    console.error('Image load error for variant:', variant.id);
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="text-gray-400 text-center">
                                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                  <div className="text-xs">
                                    {variantImages[variant.id] === 'No image' ? 'No Image' : 'Loading...'}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Variant Details */}
                          <div className="md:col-span-1 lg:col-span-2 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Color</label>
                                <p className="mt-1 text-sm text-gray-900">{variant.color}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Size</label>
                                <p className="mt-1 text-sm text-gray-900">{variant.size}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Price</label>
                                <p className="mt-1 text-sm text-gray-900 font-semibold">${variant.price.toFixed(2)}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Stock</label>
                                <p className="mt-1 text-sm text-gray-900">{variant.stock} units</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">SKU</label>
                                <p className="mt-1 text-sm text-gray-900 font-mono">{variant.sku}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <span className={getStatusBadge(variant.status)}>
                                  {variant.status}
                                </span>
                              </div>
                            </div>
                            
                            {variant.barcode && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Barcode</label>
                                  <p className="mt-1 text-sm text-gray-900 font-mono">{variant.barcode}</p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700">Barcode Type</label>
                                  <p className="mt-1 text-sm text-gray-900">{variant.barcodeType || 'Not specified'}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Variant Actions */}
                        <div className="ml-4 flex flex-col space-y-2">
                          {variant.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleVariantApproval(variant.id, true)}
                                disabled={variantApprovalLoading[variant.id]}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {variantApprovalLoading[variant.id] ? (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                ) : (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                Approve
                              </button>
                              <button
                                onClick={() => handleVariantApproval(variant.id, false)}
                                disabled={variantApprovalLoading[variant.id]}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                              >
                                {variantApprovalLoading[variant.id] ? (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                ) : (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No variants available</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Approval Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Approval Actions</h2>
              {product.status === 'PENDING' ? (
                <div className="space-y-3">
                  <button
                    onClick={() => handleApproval(true)}
                    disabled={approvalLoading}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {approvalLoading ? (
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Approve Product
                  </button>
                  <button
                    onClick={() => handleApproval(false)}
                    disabled={approvalLoading}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  >
                    {approvalLoading ? (
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Reject Product
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center mb-2">
                    {getStatusIcon(product.status)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Product has been {product.status.toLowerCase()}
                  </p>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Metadata
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono break-all">{product.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(product.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(product.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Variants:</span>
                  <span className="text-sm font-medium text-gray-900">{product.variants?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Approved Variants:</span>
                  <span className="text-sm font-medium text-green-600">
                    {product.variants?.filter(v => v.status === 'APPROVED').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pending Variants:</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {product.variants?.filter(v => v.status === 'PENDING').length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Rejected Variants:</span>
                  <span className="text-sm font-medium text-red-600">
                    {product.variants?.filter(v => v.status === 'REJECTED').length || 0}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-3">
                  <span className="text-sm text-gray-600">Total Stock:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {product.variants?.reduce((sum, v) => sum + v.stock, 0) || 0} units
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductApprovalDetail;