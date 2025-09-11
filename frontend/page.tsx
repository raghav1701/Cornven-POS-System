'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { tenantPortalService, AddProductRequest, ProductVariantRequest, TenantProduct } from '@/services/tenantPortalService';
import { ArrowLeft, Plus, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import Navigation from '@/components/Navigation';
import ImageUploadPopup from '@/components/ImageUploadPopup';

export default function AddProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<AddProductRequest>({
    name: '',
    description: '',
    category: '',
    variants: [{
      color: '',
      size: '',
      price: 0,
      stock: 0
    }]
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [createdProduct, setCreatedProduct] = useState<TenantProduct | null>(null);
  const [showImageUploadPopup, setShowImageUploadPopup] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVariantChange = (index: number, field: keyof ProductVariantRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, i) => 
        i === index ? { ...variant, [field]: value } : variant
      )
    }));
  };

  const addVariant = () => {
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, {
        color: '',
        size: '',
        price: 0,
        stock: 0
      }]
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length > 1) {
      setFormData(prev => ({
        ...prev,
        variants: prev.variants.filter((_, i) => i !== index)
      }));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing to 1:1 aspect ratio
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const size = Math.min(img.width, img.height);
          canvas.width = 400;
          canvas.height = 400;
          
          // Calculate crop position for center crop
          const cropX = (img.width - size) / 2;
          const cropY = (img.height - size) / 2;
          
          ctx?.drawImage(img, cropX, cropY, size, size, 0, 0, 400, 400);
          
          const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(resizedDataUrl);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form
      if (!formData.name || !formData.description || !formData.category) {
        throw new Error('Please fill in all required fields');
      }
      
      if (formData.variants.some(v => !v.color || !v.size || v.price <= 0 || v.stock < 0)) {
        throw new Error('Please complete all variant information');
      }
      
      const submitData: AddProductRequest = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        variants: formData.variants
      };
      
      const result = await tenantPortalService.addProduct(submitData);
      
      if (result.success && result.data) {
        setSuccess('Product submitted for approval successfully!');
        setCreatedProduct(result.data);
        setShowImageUploadPopup(true);
      } else {
        throw new Error(result.message || 'Failed to submit product');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Submit New Product for Approval</h1>
          <p className="text-gray-600 mt-2">Add a new product with variants for admin approval</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Basic Product Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  aria-label="Product Name"
                  placeholder="Enter product name"
                  title="Product Name Input"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  title="Product Category"
                  aria-label="Product Category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Bag">Bag</option>
                  <option value="Shoes">Shoes</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Home & Garden">Home & Garden</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                title="Product Description"
                placeholder="Enter product description"
                aria-label="Product Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4"></h2>
            
            <div >
              {imagePreview ? (
                <div className="flex items-center space-x-4">
                  {/* <img
                    src={imagePreview}
                    alt="Product preview"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">Image uploaded and resized to 1:1 ratio</p>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Remove Image
                    </button>
                  </div> */}
                </div>
              ) : (
                <div >
                  
                </div>
              )}
            </div>
            
            {/* <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Google Drive Integration:</strong> To use Google Drive for image hosting:
                <br />• Upload your image to Google Drive
                <br />• Right-click → Get link → Change to "Anyone with the link"
                <br />• Copy the file ID from the URL (between /d/ and /view)
                <br />• Use format: https://drive.google.com/uc?id=YOUR_FILE_ID
                <br />• Paste this URL in the "Image URL" field below
              </p>
            </div> */}
            

          </div>

          {/* Product Variants */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Product Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Variant
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.variants.map((variant, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Variant {index + 1}</h3>
                    {formData.variants.length > 1 && (
                      <button
                        title="Remove variant"
                        type="button"
                        onClick={() => removeVariant(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color *
                      </label>
                      <input
                        title="Product Variant Color"
                        placeholder="Enter color (e.g. Red, Blue)"
                        aria-label="Product Variant Color"
                        type="text"
                        value={variant.color}
                        onChange={(e) => handleVariantChange(index, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Size *
                      </label>
                      <input
                        title="Product Variant Size"
                        placeholder="Enter size (e.g. S, M, L, XL)"
                        aria-label="Product Variant Size"
                        type="text"
                        value={variant.size}
                        onChange={(e) => handleVariantChange(index, 'size', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price *
                      </label>
                      <input
                        title="Product Variant Price"
                        placeholder="Enter price (e.g. 29.99)"
                        aria-label="Product Variant Price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.price}
                        onChange={(e) => handleVariantChange(index, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stock *
                      </label>
                      <input
                        title="Product Variant Stock"
                        placeholder="Enter stock quantity"
                        aria-label="Product Variant Stock"
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => handleVariantChange(index, 'stock', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    

                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit for Approval'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Image Upload Popup */}
      {createdProduct && (
        <ImageUploadPopup
          isOpen={showImageUploadPopup}
          onClose={() => {
            setShowImageUploadPopup(false);
            router.push('/tenant/products');
          }}
          variants={createdProduct.variants}
          onSuccess={(message) => {
            setSuccess(message);
            setError('');
          }}
          onError={(message) => {
            setError(message);
            setSuccess('');
          }}
        />
      )}
    </div>
  );
}