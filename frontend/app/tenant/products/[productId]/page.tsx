'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tenantPortalService, TenantProduct } from '@/services/tenantPortalService';
import Snackbar from '@/components/Snackbar';

interface ProductLog {
  id: string;
  productId: string;
  userId: string;
  userName?: string;
  changeType: 'created' | 'updated' | 'stock_change' | 'price_change' | 'status_change' | 'variant_added' | 'variant_updated';
  previousValue: string | null;
  newValue: string;
  description?: string;
  createdAt: string;
}

const ProductDetailsPage = () => {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'variants' | 'logs'>('variants');
  const [selectedLog, setSelectedLog] = useState<ProductLog | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [variantSearchTerm, setVariantSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [variantImages, setVariantImages] = useState<{ [key: string]: string }>({});
  const [variantImageLoading, setVariantImageLoading] = useState<{ [key: string]: boolean }>({});
  const [snackbar, setSnackbar] = useState({
    isVisible: false,
    message: '',
    type: 'success' as 'success' | 'error'
  });

  const productId = params.productId as string;

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchProductDetails();
  }, [user, productId]);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const products = await tenantPortalService.getTenantProducts();
      const foundProduct = products.find(p => p.id === productId);
      if (foundProduct) {
        // Fetch logs separately if not included in the product data
        if (!foundProduct.logs || foundProduct.logs.length === 0) {
          try {
            const logs = await tenantPortalService.getProductLogs(productId);
            foundProduct.logs = logs;
          } catch (logError) {
            console.warn('Could not fetch product logs:', logError);
            // Continue without logs if the endpoint is not available
            foundProduct.logs = [];
          }
        }
        setProduct(foundProduct);
      } else {
        showSnackbar('Product not found', 'error');
        router.push('/tenant');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      showSnackbar('Failed to load product details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ isVisible: true, message, type });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, isVisible: false }));
  };

  const handleVariantClick = (variantId: string) => {
    router.push(`/tenant/products/${productId}/variants/${variantId}`);
  };

  const handleBackClick = () => {
    router.push('/tenant');
  };

  const handleLogClick = (log: ProductLog) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };

  const closeLogModal = () => {
    setShowLogModal(false);
    setSelectedLog(null);
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    setSelectedImage(null);
  };

  // Variant Image API functions
  const fetchVariantImage = async (variantId: string) => {
    if (variantImages[variantId] || variantImageLoading[variantId]) {
      return; // Already loaded or loading
    }

    console.log('Fetching image for variant:', variantId);
    setVariantImageLoading(prev => ({ ...prev, [variantId]: true }));
    try {
      const response = await tenantPortalService.getVariantImageUrlSafe(variantId);
      console.log('Variant image response:', response);
      if (response && response.url) {
        setVariantImages(prev => ({ ...prev, [variantId]: response.url }));
      } else {
        console.warn(`No image URL available for variant ${variantId}`);
        setVariantImages(prev => ({ ...prev, [variantId]: 'No image' }));
      }
    } catch (error) {
      console.error('Error fetching variant image:', error);
      // Set a placeholder or error state
      setVariantImages(prev => ({ ...prev, [variantId]: '' }));
    } finally {
      setVariantImageLoading(prev => ({ ...prev, [variantId]: false }));
    }
  };

  // Fetch images for all variants when product is loaded
  useEffect(() => {
    if (product && product.variants) {
      product.variants.forEach(variant => {
        if (variant.id && variant.imageKey) {
          fetchVariantImage(variant.id);
        }
      });
    }
  }, [product]);

  const formatLogChangeType = (changeType: string) => {
    const types: { [key: string]: string } = {
      'created': 'Product Created',
      'updated': 'Product Updated',
      'stock_change': 'Stock Changed',
      'price_change': 'Price Changed',
      'status_change': 'Status Changed',
      'variant_added': 'Variant Added',
      'variant_updated': 'Variant Updated'
    };
    return types[changeType] || changeType;
  };

  const getLogIcon = (changeType: string) => {
    switch (changeType) {
      case 'created':
        return '🆕';
      case 'stock_change':
        return '📦';
      case 'price_change':
        return '💰';
      case 'status_change':
        return '🔄';
      case 'variant_added':
      case 'variant_updated':
        return '🎨';
      default:
        return '📝';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading product details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Product not found</p>
          <button
            onClick={handleBackClick}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="mt-2 text-gray-600">{product.description}</p>
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Product Details</h3>

              <p><span className="font-medium">Category:</span> {product.category}</p>
              <p><span className="font-medium">Created:</span> {new Date(product.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory Summary</h3>
              <p><span className="font-medium">Total Variants:</span> {product.variants?.length || 0}</p>
              <p><span className="font-medium">Total Stock:</span> {product.variants?.reduce((sum, v) => sum + (v.stock || 0), 0) || 0}</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Price Range</h3>
              {product.variants && product.variants.length > 0 ? (
                <p>
                  <span className="font-medium">$</span>
                  {Math.min(...product.variants.map(v => v.price || 0)).toFixed(2)} - 
                  ${Math.max(...product.variants.map(v => v.price || 0)).toFixed(2)}
                </p>
              ) : (
                <p>No variants available</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('variants')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'variants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Product Variants ({product.variants?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`pb-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'logs'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Activity Logs ({product.logs?.length || 0})
              </button>
            </div>
          </div>

          {/* Variants Tab */}
          {activeTab === 'variants' && (
            <div className="p-6">
              {product.variants && product.variants.length > 0 ? (
                <div>
                  {/* Search Bar */}
                  <div className="mb-6">
                    <input
                      type="text"
                      value={variantSearchTerm}
                      onChange={(e) => setVariantSearchTerm(e.target.value)}
                      placeholder="Search variants by color, size, SKU, or barcode..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Variants Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {product.variants
                      .filter((variant) => {
                        if (!variantSearchTerm) return true;
                        const searchLower = variantSearchTerm.toLowerCase();
                        return (
                          variant.color?.toLowerCase().includes(searchLower) ||
                          variant.size?.toLowerCase().includes(searchLower) ||
                          variant.barcode?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((variant) => {
                        return (
                          <div key={variant.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
                            {/* Variant Image */}
                             <div className="mb-4">
                               <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                                 {variantImageLoading[variant.id || ''] ? (
                                   <div className="w-full h-full flex items-center justify-center">
                                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                   </div>
                                 ) : variantImages[variant.id || ''] && variantImages[variant.id || ''] !== 'No image' && variantImages[variant.id || ''] !== '' ? (
                                   <img 
                                     src={variantImages[variant.id || '']}
                                     alt={`${variant.color} - ${variant.size}`}
                                     className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                                     onClick={() => handleImageClick(variantImages[variant.id || ''])}
                                     onError={(e) => {
                                       const target = e.target as HTMLImageElement;
                                       target.style.display = 'none';
                                       target.nextElementSibling?.classList.remove('hidden');
                                     }}
                                   />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center text-gray-400">
                                     <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                     </svg>
                                   </div>
                                 )}
                               </div>
                             </div>
                            
                            {/* Variant Details */}
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {variant.color && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {variant.color}
                                  </span>
                                )}
                                {variant.size && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                    {variant.size}
                                  </span>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">Price:</span>
                                  <span className="text-lg font-bold text-green-600">${variant.price?.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">Stock:</span>
                                  <span className={`text-sm font-semibold ${
                                    (variant.stock || 0) > 10 ? 'text-green-600' : 
                                    (variant.stock || 0) > 0 ? 'text-yellow-600' : 'text-red-600'
                                  }`}>
                                    {variant.stock || 0} units
                                  </span>
                                </div>
                                {variant.barcode && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-600">Barcode:</span>
                                    <span className="text-xs text-gray-500 font-mono">{variant.barcode}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-medium text-gray-600">Created:</span>
                                  <span className="text-xs text-gray-500">
                                    {variant.createdAt ? new Date(variant.createdAt).toLocaleDateString() : 'N/A'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Action Button */}
                              <button
                                onClick={() => variant.id && handleVariantClick(variant.id)}
                                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center"
                              >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Variant
                              </button>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Variants Available</h3>
                  <p className="text-gray-500">This product doesn't have any variants yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="p-6">
              {product.logs && product.logs.length > 0 ? (
                <div className="space-y-4">
                  {product.logs.map((log) => (
                    <div
                      key={log.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleLogClick(log as ProductLog)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">{getLogIcon(log.changeType)}</span>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {formatLogChangeType(log.changeType)}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {new Date(log.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {log.previousValue && (
                                <span className="text-red-600">From: {log.previousValue}</span>
                              )}
                              {log.previousValue && log.newValue && <span className="mx-2">→</span>}
                              <span className="text-green-600">To: {log.newValue}</span>
                            </div>
                            {log.userId && (
                              <div className="mt-1 text-xs text-gray-500">
                                By: User {log.userId}
                              </div>
                            )}
                          </div>
                        </div>
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Logs</h3>
                  <p className="text-gray-500">No changes have been recorded for this product yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={closeSnackbar}
      />

      {/* Image Modal */}
      {isImageModalOpen && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={closeImageModal}>
          <div className="relative max-w-4xl max-h-[90vh] mx-4">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedImage}
              alt="Product variant"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {showLogModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {getLogIcon(selectedLog.changeType)} {formatLogChangeType(selectedLog.changeType)}
              </h3>
              <button
                title="Close modal"
                onClick={closeLogModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Log ID</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.userId}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Change Type</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {formatLogChangeType(selectedLog.changeType)}
                    </p>
                  </div>
                </div>

                {selectedLog.previousValue && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Previous Value</label>
                    <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
                      {selectedLog.previousValue}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Value</label>
                  <p className="text-sm text-green-600 bg-green-50 p-3 rounded border border-green-200">
                    {selectedLog.newValue}
                  </p>
                </div>

                {selectedLog.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedLog.description}
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Change Summary</h4>
                  <p className="text-sm text-blue-800">
                    {selectedLog.previousValue 
                      ? `Changed from "${selectedLog.previousValue}" to "${selectedLog.newValue}"`
                      : `Set to "${selectedLog.newValue}"`
                    } on {new Date(selectedLog.createdAt).toLocaleDateString()} at {new Date(selectedLog.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeLogModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

export default ProductDetailsPage;