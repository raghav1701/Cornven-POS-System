'use client';

import React, { useState, useEffect } from 'react';
import { X, Package, Tag, Palette, Ruler, DollarSign, Archive } from 'lucide-react';

interface ProductData {
  id: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  size: string;
  price: number;
  stock: number;
  barcode: string;
  tenant: {
    id: string;
    businessName: string;
  };
}

interface ProductConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productData: ProductData | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

const ProductConfirmationModal: React.FC<ProductConfirmationModalProps> = ({
  isOpen,
  onClose,
  productData,
  onConfirm,
  isLoading = false
}) => {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const handleConfirm = async () => {
    if (isAddingToCart || !productData || productData.stock === 0) return;
    
    setIsAddingToCart(true);
    try {
      await onConfirm();
      // Reset state immediately after successful confirmation
      setIsAddingToCart(false);
    } catch (error) {
      console.error('Error adding to cart:', error);
      setIsAddingToCart(false);
    }
  };
  
  // Reset adding state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAddingToCart(false);
    }
  }, [isOpen]);
  
  // Reset adding state when product data changes
  useEffect(() => {
    setIsAddingToCart(false);
  }, [productData]);
  if (!isOpen || !productData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Found
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Product Name */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-lg text-gray-800">{productData.productName}</h4>
            <p className="text-sm text-gray-600">{productData.category}</p>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Color</p>
                <p className="font-medium">{productData.color}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Ruler className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Size</p>
                <p className="font-medium">{productData.size}</p>
              </div>
            </div>
          </div>

          {/* Price and Stock */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Price</p>
                <p className="font-semibold text-green-600">${productData.price}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Stock</p>
                <p className={`font-medium ${
                  productData.stock > 10 ? 'text-green-600' : 
                  productData.stock > 0 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {productData.stock} units
                </p>
              </div>
            </div>
          </div>

          {/* Barcode */}
          <div className="bg-gray-50 p-3 rounded">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-xs text-gray-500">Barcode</p>
                <p className="font-mono text-sm">{productData.barcode}</p>
              </div>
            </div>
          </div>

          {/* Tenant Info */}
          <div className="border-t pt-3">
            <p className="text-xs text-gray-500">Supplier</p>
            <p className="font-medium">{productData.tenant.businessName}</p>
          </div>

          {/* Stock Warning */}
          {productData.stock === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm font-medium">⚠️ Out of Stock</p>
              <p className="text-red-600 text-xs">This product is currently unavailable.</p>
            </div>
          )}

          {/* Confirmation Question */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 font-medium text-center">
              Are you sure you want to add this product to the cart?
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              No, Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={productData.stock === 0 || isAddingToCart}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                productData.stock === 0 || isAddingToCart
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isAddingToCart ? 'Adding...' : 'Yes, Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductConfirmationModal;