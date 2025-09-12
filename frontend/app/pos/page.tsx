'use client';

import React, { useEffect, useState, useRef } from 'react';
import { adminProductService, AdminProduct, ProductVariant } from '../../services/adminProductService';
import { tenantPortalService } from '../../services/tenantPortalService';
import { useAuth } from '../../contexts/AuthContext';
import { Search, ShoppingCart, Trash2, Plus, Minus, Receipt, Printer, Scan, X } from 'lucide-react';
import BarcodeScanner from '../../components/BarcodeScanner';
import ProductConfirmationModal from '../../components/ProductConfirmationModal';
import Navigation from '../../components/Navigation';

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variant: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface Invoice {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  timestamp: Date;
  paymentMethod?: string;
}

const POS: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [variantImages, setVariantImages] = useState<Record<string, string>>({});
  const [variantImageLoading, setVariantImageLoading] = useState<Record<string, boolean>>({});
  
  // Barcode scanning states
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showProductConfirmation, setShowProductConfirmation] = useState(false);
  const [scannedProductData, setScannedProductData] = useState<any>(null);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  
  // Error modal states
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastScannedBarcode, setLastScannedBarcode] = useState<string>('');
  const [scanCooldown, setScanCooldown] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const lookupInProgressRef = useRef(false);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Prevent hydration mismatch by not rendering until client-side
  const [isClient, setIsClient] = useState(false);
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      let fetchedProducts: AdminProduct[];
      
      console.log('Current user in POS:', user);
      console.log('User role:', user?.role);
      console.log('User tenantId:', user?.tenantId);
      
      // If user is a tenant, load only their products
      if (user?.role === 'tenant' && user?.tenantId) {
        fetchedProducts = await adminProductService.getProducts(user.tenantId);
        console.log('Fetched tenant products:', fetchedProducts);
      } else {
        // For admin/other roles, load all products
        fetchedProducts = await adminProductService.getAllProducts();
        console.log('Fetched all products:', fetchedProducts);
      }
      
      // Filter products that have at least one variant
      const availableProducts = fetchedProducts.filter((product: AdminProduct) =>
        product.variants && product.variants.length > 0
      );
      
      console.log('Available products after filtering:', availableProducts);
      setProducts(availableProducts);
      
      // Preload all variant images
      availableProducts.forEach(product => {
        product.variants?.forEach(variant => {
          fetchVariantImage(variant.id);
        });
      });
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch S3 image for variant using the same method as inventory page
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

  // Barcode scanning functions
  const handleBarcodeScanned = async (barcode: string) => {
    // Prevent multiple calls and loops, but allow new different barcodes
    if (isLookingUpBarcode || lookupInProgressRef.current) {
      console.log('Barcode scan blocked - lookup in progress');
      return;
    }
    
    // If same barcode scanned within cooldown, ignore
    if (scanCooldown && barcode === lastScannedBarcode) {
      console.log('Barcode scan blocked - same barcode in cooldown');
      return;
    }
    
    // Clear any existing states first to prevent modal persistence
    setShowProductConfirmation(false);
    setScannedProductData(null);
    setShowErrorModal(false);
    setErrorMessage('');
    
    // Force a brief delay to ensure state is cleared before proceeding
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Set both state and ref to prevent any race conditions
    setIsLookingUpBarcode(true);
    lookupInProgressRef.current = true;
    setShowBarcodeScanner(false); // Close scanner immediately
    setLastScannedBarcode(barcode);
    setScanCooldown(true);
    
    // Clear any existing cooldown timeout
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    
    try {
      console.log('Looking up barcode:', barcode);
      const productData = await adminProductService.lookupByBarcode(barcode);
      
      // Double check we haven't been cancelled
      if (!lookupInProgressRef.current) {
        console.log('Barcode lookup cancelled - state changed during request');
        return;
      }
      
      setScannedProductData(productData);
      setShowProductConfirmation(true);
    } catch (error) {
      console.error('Failed to lookup barcode:', error);
      
      // Only show error if we haven't been cancelled
      if (lookupInProgressRef.current) {
        setShowErrorModal(true);
        setErrorMessage('Product not found. Please try scanning again or enter the product manually.');
      }
    } finally {
      // Always reset both state and ref in finally block
      setIsLookingUpBarcode(false);
      lookupInProgressRef.current = false;
      
      // Set cooldown timeout to reset after 1 second
      cooldownTimeoutRef.current = setTimeout(() => {
        setScanCooldown(false);
        setLastScannedBarcode(''); // Clear last scanned barcode to allow new scans
        cooldownTimeoutRef.current = null;
      }, 1000);
    }
  };

  const handleConfirmScannedProduct = async () => {
    if (scannedProductData && !isLookingUpBarcode && !lookupInProgressRef.current) {
      // Create a cart item from scanned product data
      const cartItem: CartItem = {
        id: scannedProductData.id,
        productId: scannedProductData.productId,
        variantId: scannedProductData.id,
        name: scannedProductData.productName,
        variant: `${scannedProductData.color} - ${scannedProductData.size}`,
        price: scannedProductData.price,
        quantity: 1
      };
      
      setCart((prev: CartItem[]) => {
        const existingItem = prev.find((item: CartItem) => item.id === cartItem.id);
        if (existingItem) {
          return prev.map((item: CartItem) => 
            item.id === cartItem.id 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, cartItem];
      });
      
      // Completely reset all scanning states
      setShowProductConfirmation(false);
      setScannedProductData(null);
      setIsLookingUpBarcode(false);
      lookupInProgressRef.current = false;
      if (cooldownTimeoutRef.current) {
        clearTimeout(cooldownTimeoutRef.current);
        cooldownTimeoutRef.current = null;
      }
      setScanCooldown(false);
      setLastScannedBarcode('');
      setShowBarcodeScanner(false);
      setShowErrorModal(false);
      setErrorMessage('');
      
      // Set a brief cooldown to prevent immediate re-scanning
      setScanCooldown(true);
      cooldownTimeoutRef.current = setTimeout(() => {
        setScanCooldown(false);
        cooldownTimeoutRef.current = null;
      }, 1000);
    }
  };

  const handleCancelScannedProduct = () => {
    // Prevent multiple calls
    if (lookupInProgressRef.current) return;
    
    // Completely reset all scanning states
    setShowProductConfirmation(false);
    setScannedProductData(null);
    setIsLookingUpBarcode(false);
    lookupInProgressRef.current = false;
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    setScanCooldown(false);
    setLastScannedBarcode('');
    setShowBarcodeScanner(false);
    setShowErrorModal(false);
    setErrorMessage('');
    
    // Set a brief cooldown to prevent immediate re-scanning
    setScanCooldown(true);
    cooldownTimeoutRef.current = setTimeout(() => {
      setScanCooldown(false);
      cooldownTimeoutRef.current = null;
    }, 500);
  };

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle product click to show variants
  const handleProductClick = (product: AdminProduct) => {
    setSelectedProduct(product);
    setShowVariantModal(true);
  };

  // Add item to cart
  const addToCart = (product: AdminProduct, variant: ProductVariant) => {
    const cartItemId = `${product.id}-${variant.id}`;
    const existingItem = cart.find(item => item.id === cartItemId);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === cartItemId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: CartItem = {
        id: cartItemId,
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variant: `${variant.color} - ${variant.size}`,
        price: variant.price,
        quantity: 1,
        imageUrl: variantImages[variant.id]
      };
      setCart([...cart, newItem]);
    }
    
    setShowVariantModal(false);
  };

  // Update cart item quantity
  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(cart.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // useEffect hooks
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Ensure this only runs on client side to prevent hydration mismatch
    if (typeof window !== 'undefined' && user && isClient) {
      loadProducts();
    }
  }, [user, isClient]);
  
  // Cleanup effect for timeouts
   useEffect(() => {
     return () => {
       if (cooldownTimeoutRef.current) {
         clearTimeout(cooldownTimeoutRef.current);
         cooldownTimeoutRef.current = null;
       }
     };
   }, []);
  


  // Fetch variant images when modal opens
  useEffect(() => {
    if (showVariantModal && selectedProduct && selectedProduct.variants) {
      selectedProduct.variants.forEach(variant => {
        fetchVariantImage(variant.id);
      });
    }
  }, [showVariantModal, selectedProduct]);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Point of Sale</h1>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  // Generate unique idempotency key
  const generateIdempotencyKey = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const timeStr = now.getTime().toString().slice(-4); // Last 4 digits of timestamp
    return `TERM1-${dateStr}-${timeStr}`;
  };

  // Convert payment method to API format
  const getPaymentMethodForAPI = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'CASH';
      case 'card':
        return 'CARD';
      case 'upi':
        return 'UPI';
      default:
        return 'CASH';
    }
  };

  // Checkout with API integration
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsProcessingPayment(true);

    try {
      console.log('Checkout - Current user:', user);
      console.log('Checkout - Cart items:', cart);
      
      // Calculate values in cents
      const subtotalCents = Math.round(subtotal * 100);
      const taxCents = Math.round(tax * 100);
      const totalCents = Math.round(total * 100);

      // Get the tenant ID from the first product in cart (all items should be from same tenant)
      const firstCartItem = cart[0];
      const product = products.find(p => p.id === firstCartItem.productId);
      const tenantId = product?.tenantId || user?.tenantId || "";
      
      console.log('Using tenant ID from product:', tenantId);
      console.log('Product tenant info:', product?.tenant);

      // Prepare checkout data
      const checkoutData = {
        idempotencyKey: generateIdempotencyKey(),
        tenantId: tenantId, // Use tenant ID from product 
        cashierUserId: user?.id || "", // Use current user's 
        currency: "AUD",
        items: cart.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.price * 100),
          discountCents: 0,
          taxCents: Math.round((item.price * item.quantity * 0.1) * 100) // 10% tax per item
        })),
        payments: [
          {
            method: getPaymentMethodForAPI(paymentMethod),
            amountCents: totalCents
          }
        ]
      };
      
      console.log('Checkout data being sent:', checkoutData);

      // Make API call
       const response = await fetch('https://cornven-pos-system.vercel.app/pos/checkout', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Accept': 'application/json',
           'Origin': 'http://localhost:3001'
         },
         mode: 'cors',
         credentials: 'include',
         body: JSON.stringify(checkoutData)
       });

      if (!response.ok) {
        throw new Error(`Checkout failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Checkout successful:', result);

      // Generate local invoice for display
      const invoice: Invoice = {
        id: result.id || `INV-${Date.now()}`,
        items: [...cart],
        subtotal,
        tax,
        total,
        timestamp: new Date(),
        paymentMethod
      };

      setCurrentInvoice(invoice);
      setShowInvoice(true);
      setCart([]); // Clear cart after successful checkout

    } catch (error) {
       console.error('Checkout API error:', error);
       
       // Fallback to local invoice generation if API fails
       console.log('Falling back to local invoice generation');
       
       const invoice: Invoice = {
         id: `INV-${Date.now()}`,
         items: [...cart],
         subtotal,
         tax,
         total,
         timestamp: new Date(),
         paymentMethod
       };

       setCurrentInvoice(invoice);
       setShowInvoice(true);
       setCart([]);
       
       // Show user-friendly message
       alert('Checkout completed locally. API connection unavailable.');
     } finally {
       setIsProcessingPayment(false);
     }
  };

  // Generate invoice (fallback method)
  const generateInvoice = async () => {
    await handleCheckout();
  };

  // Print invoice
  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="flex h-screen">
        {/* Left Side - Cart/Receipt */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <ShoppingCart className="mr-2" size={24} />
              Current Order
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                <p>No items in cart</p>
                <p className="text-sm">Click on products to add them</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.variant}</p>
                        <p className="text-sm font-medium text-green-600">${item.price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Cart Summary */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                </select>
                
                <button
                  onClick={generateInvoice}
                  disabled={isProcessingPayment}
                  className={`w-full py-3 rounded-lg font-medium flex items-center justify-center transition-colors ${
                    isProcessingPayment 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Receipt className="mr-2" size={20} />
                      Pay Now
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Side - Products */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">POS Terminal</h1>
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="flex space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => {
                  // Clear all existing timeouts and states
                  if (cooldownTimeoutRef.current) {
                    clearTimeout(cooldownTimeoutRef.current);
                    cooldownTimeoutRef.current = null;
                  }
                  
                  // Complete state reset before opening scanner
                  setIsLookingUpBarcode(false);
                  lookupInProgressRef.current = false;
                  setScannedProductData(null);
                  setShowProductConfirmation(false);
                  setShowErrorModal(false);
                  setErrorMessage('');
                  setLastScannedBarcode('');
                  setScanCooldown(false);
                  
                  // Open scanner
                  setShowBarcodeScanner(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Scan className="w-4 h-4" />
                Scan Barcode
              </button>
            </div>
          </div>
          
          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                    <div className="w-full h-32 bg-gray-200 rounded-lg mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => {
                  const approvedVariants = product.variants || [];
                  const minPrice = Math.min(...approvedVariants.map(v => v.price));
                  const maxPrice = Math.max(...approvedVariants.map(v => v.price));
                  const totalStock = approvedVariants.reduce((sum, v) => sum + v.stock, 0);
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => handleProductClick(product)}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                        {product.variants?.[0]?.imageKey && variantImages[product.variants[0].id] ? (
                          <img
                            src={variantImages[product.variants[0].id]}
                            alt={product.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-gray-400 text-4xl">📦</div>
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-1 truncate">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{product.category}</p>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-green-600">
                            {minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`}
                          </p>
                          <p className="text-xs text-gray-500">{approvedVariants.length} variants</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{totalStock} in stock</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {!loading && filteredProducts.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <p>No products found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Variant Selection Modal */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h3>
                  <p className="text-gray-600">{selectedProduct.description}</p>
                </div>
                <button
                  onClick={() => setShowVariantModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedProduct.variants?.map(variant => (
                  <div
                    key={variant.id}
                    onClick={() => addToCart(selectedProduct, variant)}
                    className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="w-full h-32 bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                      {variantImages[variant.id] && variantImages[variant.id] !== 'No image' && variantImages[variant.id] !== '' ? (
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
                          {variantImages[variant.id] === 'No image' ? (
                            <div className="text-sm">No Image</div>
                          ) : (
                            <div className="text-2xl">📦</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{variant.color}</span>
                        <span className="text-sm text-gray-600">{variant.size}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-green-600">${variant.price.toFixed(2)}</span>
                        <span className="text-sm text-gray-600">{variant.stock} in stock</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Full-screen Loader with Blur */}
      {isLookingUpBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-8 shadow-xl">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-lg font-medium text-gray-900">Looking up product...</p>
              <p className="text-sm text-gray-600">Please wait while we find your product</p>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
       <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScanned}
        isLoading={isLookingUpBarcode}
      />
       
       {/* Product Confirmation Modal */}
       <ProductConfirmationModal
         key={scannedProductData?.id || 'empty'}
         isOpen={showProductConfirmation}
         onClose={handleCancelScannedProduct}
         productData={scannedProductData}
         onConfirm={handleConfirmScannedProduct}
         isLoading={isLookingUpBarcode}
       />
      
      {/* Invoice Modal */}
      {showInvoice && currentInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4 print:max-w-none print:w-full print:mx-0 print:rounded-none">
            <div className="p-6 print:p-8">
              <div className="flex justify-between items-start mb-6 print:mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
                  <p className="text-gray-600">#{currentInvoice.id}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>{currentInvoice.timestamp.toLocaleDateString()}</p>
                  <p>{currentInvoice.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="border-t border-b border-gray-200 py-4 mb-4">
                <h3 className="font-medium text-gray-900 mb-3">Cornven POS System</h3>
                <p className="text-sm text-gray-600">Concept Cube Store</p>
                <p className="text-sm text-gray-600">Australia</p>
              </div>
              
              <div className="space-y-3 mb-6">
                {currentInvoice.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.variant}</p>
                      <p className="text-sm text-gray-600">{item.quantity} × ${item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-medium">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${currentInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (10%):</span>
                  <span>${currentInvoice.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${currentInvoice.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Payment Method:</span>
                  <span className="capitalize">{currentInvoice.paymentMethod}</span>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6 print:hidden">
                <button
                  onClick={printInvoice}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center"
                >
                  <Printer className="mr-2" size={16} />
                  Print
                </button>
                <button
                  onClick={() => setShowInvoice(false)}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-600">Scan Error</h3>
              <button
                onClick={() => {
                  setShowErrorModal(false);
                  setErrorMessage('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-700 mb-6">{errorMessage}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Prevent multiple clicks
                  if (isLookingUpBarcode || lookupInProgressRef.current) return;
                  
                  // Complete state reset
                  setShowErrorModal(false);
                  setErrorMessage('');
                  setIsLookingUpBarcode(false);
                  lookupInProgressRef.current = false;
                  setScannedProductData(null);
                  setShowProductConfirmation(false);
                  setLastScannedBarcode('');
                  setScanCooldown(false);
                  if (cooldownTimeoutRef.current) {
                    clearTimeout(cooldownTimeoutRef.current);
                    cooldownTimeoutRef.current = null;
                  }
                  
                  // Set brief cooldown to prevent immediate multiple clicks
                  setScanCooldown(true);
                  cooldownTimeoutRef.current = setTimeout(() => {
                    setScanCooldown(false);
                    cooldownTimeoutRef.current = null;
                    // Open scanner after cooldown
                    setShowBarcodeScanner(true);
                  }, 500);
                }}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                disabled={isLookingUpBarcode || lookupInProgressRef.current}
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  // Prevent multiple clicks
                  if (isLookingUpBarcode || lookupInProgressRef.current) return;
                  
                  // Complete state reset
                  setShowErrorModal(false);
                  setErrorMessage('');
                  setIsLookingUpBarcode(false);
                  lookupInProgressRef.current = false;
                  if (cooldownTimeoutRef.current) {
                    clearTimeout(cooldownTimeoutRef.current);
                    cooldownTimeoutRef.current = null;
                  }
                  setScanCooldown(false);
                  setScannedProductData(null);
                  setShowProductConfirmation(false);
                  setShowBarcodeScanner(false);
                  setLastScannedBarcode('');
                }}
                className="flex-1 bg-gray-600 text-white py-2 rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50"
                disabled={isLookingUpBarcode || lookupInProgressRef.current}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;