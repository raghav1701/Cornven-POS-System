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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
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
              <p><span className="font-medium">SKU:</span> {product.sku}</p>
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {product.variants && product.variants.length > 0 ? (
                    product.variants.map((variant) => (
                      <tr
                        key={variant.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => variant.id && handleVariantClick(variant.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{variant.color}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{variant.size}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${variant.price?.toFixed(2)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{variant.stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{variant.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {variant.createdAt ? new Date(variant.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              variant.id && handleVariantClick(variant.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        No variants available for this product
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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