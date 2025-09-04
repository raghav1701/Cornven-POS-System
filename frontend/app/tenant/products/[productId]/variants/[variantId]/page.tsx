'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tenantPortalService, TenantProduct } from '@/services/tenantPortalService';
import Snackbar from '@/components/Snackbar';

interface Variant {
  id?: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  createdAt?: string;
}

const VariantEditPage = () => {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [variant, setVariant] = useState<Variant | null>(null);
  const [product, setProduct] = useState<TenantProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    price: '',
    stock: ''
  });
  const [snackbar, setSnackbar] = useState({
    isVisible: false,
    message: '',
    type: 'success' as 'success' | 'error'
  });

  const productId = params.productId as string;
  const variantId = params.variantId as string;

  useEffect(() => {
    if (!user) {
      router.push('/auth');
      return;
    }
    fetchVariantDetails();
  }, [user, productId, variantId]);

  const fetchVariantDetails = async () => {
    try {
      setLoading(true);
      const products = await tenantPortalService.getTenantProducts();
      const foundProduct = products.find(p => p.id === productId);
      
      if (foundProduct) {
        setProduct(foundProduct);
        const foundVariant = foundProduct.variants?.find(v => v.id === variantId);
        
        if (foundVariant) {
          setVariant(foundVariant);
          setFormData({
            price: foundVariant.price?.toString() || '',
            stock: foundVariant.stock?.toString() || ''
          });
        } else {
          showSnackbar('Variant not found', 'error');
          router.push(`/tenant/products/${productId}`);
        }
      } else {
        showSnackbar('Product not found', 'error');
        router.push('/tenant');
      }
    } catch (error) {
      console.error('Error fetching variant details:', error);
      showSnackbar('Failed to load variant details', 'error');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.price || !formData.stock) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }

    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock);

    if (isNaN(price) || price < 0) {
      showSnackbar('Please enter a valid price', 'error');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      showSnackbar('Please enter a valid stock quantity', 'error');
      return;
    }

    try {
      setIsUpdating(true);
      await tenantPortalService.updateVariant(productId, variantId, price, stock);
      
      showSnackbar('Variant updated successfully!', 'success');
      
      // Update local state
      if (variant) {
        setVariant({
          ...variant,
          price,
          stock
        });
      }
      
      // Navigate back to product page after a short delay
      setTimeout(() => {
        router.push(`/tenant/products/${productId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error updating variant:', error);
      showSnackbar('Failed to update variant', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      setIsDeleting(true);
      await tenantPortalService.deleteVariant(productId, variantId);
      
      showSnackbar('Variant deleted successfully!', 'success');
      
      // Navigate back to product page after a short delay
      setTimeout(() => {
        router.push(`/tenant/products/${productId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error deleting variant:', error);
      showSnackbar('Failed to delete variant', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  const handleBackClick = () => {
    router.push(`/tenant/products/${productId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading variant details...</p>
        </div>
      </div>
    );
  }

  if (!variant || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Variant not found</p>
          <button
            onClick={handleBackClick}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="mb-4 flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {product.name}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Variant</h1>
          <p className="mt-2 text-gray-600">
            {variant.color} - {variant.size}
          </p>
        </div>

        {/* Variant Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Variant Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Variant Information</h3>
              <p><span className="font-medium">Product:</span> {product.name}</p>
              <p><span className="font-medium">Color:</span> {variant.color}</p>
              <p><span className="font-medium">Size:</span> {variant.size}</p>

              {variant.createdAt && (
                <p><span className="font-medium">Created:</span> {new Date(variant.createdAt).toLocaleDateString()}</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Current Values</h3>
              <p><span className="font-medium">Current Price:</span> ${variant.price?.toFixed(2)}</p>
              <p><span className="font-medium">Current Stock:</span> {variant.stock}</p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Update Price & Stock</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter price"
                  required
                />
              </div>
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  id="stock"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter stock quantity"
                  required
                />
              </div>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDeleteClick}
                disabled={isUpdating || isDeleting}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Variant
                  </>
                )}
              </button>
              
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBackClick}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isUpdating || isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || isDeleting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Variant'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Variant</h3>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this variant ({variant?.color} - {variant?.size})? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        isVisible={snackbar.isVisible}
        onClose={closeSnackbar}
      />
    </div>
  );
};

export default VariantEditPage;