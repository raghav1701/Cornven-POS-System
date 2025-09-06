'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Upload, 
  BarChart3, 
  AlertTriangle,
  Truck,
  Eye,
  Edit,
  Trash2,
  FileSpreadsheet,
  QrCode,
  Users,
  TrendingDown,
  Calendar,
  User,
  ArrowLeft,
  ShoppingBag,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { 
  mockProducts, 
  mockCategories,  
  mockLowStockAlerts,
  mockDeliveryLogs,
  filterProducts,
  exportProductsToCSV,
  importProductsFromCSV,
  generateBarcode,
  generateSKU,
  getProductsByTenant
} from '@/data/mockProducts';

import { Product, InventoryChange, DeliveryLog, InventoryFilter } from '@/types/product';
import { adminProductService, AdminProduct } from '@/services/adminProductService';
import { adminTenantService, AdminTenant } from '@/services/adminTenantService';
import { authService } from '@/services/authService';
import { tenantPortalService } from '@/services/tenantPortalService';
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { calculateTenantStatus, getStatusColorClass, getStatusDisplayText, updateTenantRentalStatuses } from '@/utils/tenantStatus';

export default function InventoryPage() {
  const { user } = useAuth();

  // Barcode API functions
  const fetchBarcodeImage = async (variantId: string) => {
    setBarcodeLoading(true);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`https://cornven-pos-system.vercel.app/variants/${variantId}/barcode.png`, {
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

      const response = await fetch(`https://cornven-pos-system.vercel.app/variants/lookup?barcode=${encodeURIComponent(barcode)}`, {
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
  const router = useRouter();
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<AdminProduct | null>(null);

  // Fetch variant images when modal opens
  useEffect(() => {
    if (showVariantModal && selectedProductForModal && selectedProductForModal.variants) {
      selectedProductForModal.variants.forEach(variant => {
        fetchVariantImage(variant.id);
      });
    }
  }, [showVariantModal, selectedProductForModal]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedVariantForBarcode, setSelectedVariantForBarcode] = useState<any>(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string>('');
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState('');
  const [barcodeSearchResult, setBarcodeSearchResult] = useState<any>(null);
  const [barcodeSearchLoading, setBarcodeSearchLoading] = useState(false);
  const [variantSearchTerm, setVariantSearchTerm] = useState('');
  const [variantImages, setVariantImages] = useState<{[key: string]: string}>({});
  const [variantImageLoading, setVariantImageLoading] = useState<{[key: string]: boolean}>({});
  const [apiProducts, setApiProducts] = useState<AdminProduct[]>([]);
  const [apiTenants, setApiTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [filters, setFilters] = useState<InventoryFilter>({
    category: '',
    tenantId: '',
    stockStatus: '',
    priceRange: { min: undefined, max: undefined }
  });
  
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>('');
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [filteredAdminProducts, setFilteredAdminProducts] = useState<AdminProduct[]>([]);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // Load API products
  const loadApiProducts = async () => {
    try {
      setLoading(true);
      const products = await adminProductService.getAllProducts();
      console.log('Successfully fetched products:', products.length, 'items');
      setApiProducts(products);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all products (API + mock)
  const loadAllProducts = async () => {
    await loadApiProducts();
  };

  // Use unified tenant status calculation from utils

  // Load API tenants
  const loadApiTenants = async () => {
    try {
      setTenantsLoading(true);
      const tenants = await adminTenantService.getAllTenants();
      console.log('Successfully fetched tenants:', tenants.length, 'items');
      
      // Update rental statuses dynamically on frontend
      const tenantsWithUpdatedStatuses = updateTenantRentalStatuses(tenants);
      
      // Add calculated status to each tenant
      const tenantsWithStatus = tenantsWithUpdatedStatuses.map(tenant => ({
        ...tenant,
        calculatedStatus: calculateTenantStatus({ ...tenant, rentals: tenant.rentals || [] })
      })) as unknown as AdminTenant[];
      
      setApiTenants(tenantsWithStatus);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setTenantsLoading(false);
    }
  };

  // Load admin products for approvals
  const loadAdminProducts = async () => {
    try {
      const products = await adminProductService.getAllProducts();
      setAdminProducts(products);
    } catch (error) {
      console.error('Error loading admin products:', error);
    }
  };

  // Handle approval/rejection
  const handleApproval = async (productId: string, approve: boolean) => {
    try {
      setApprovalLoading(productId);
      await adminProductService.approveProduct(productId, approve);
      // Reload products after approval
      await loadAdminProducts();
    } catch (error) {
      console.error('Error updating approval:', error);
      alert('Failed to update approval status');
    } finally {
      setApprovalLoading(null);
    }
  };

  useEffect(() => {
    loadAllProducts();
    loadApiTenants();
  }, []);

  // Load admin products when approvals tab is selected
  useEffect(() => {
    if (activeTab === 'approvals') {
      loadAdminProducts();
    }
  }, [activeTab]);

  // Filter admin products based on search
  useEffect(() => {
    let filtered = adminProducts;

    if (searchQuery.trim()) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tenant?.businessName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAdminProducts(filtered);
  }, [adminProducts, searchQuery]);

  // Filter tenants based on search and status
  const filteredTenants = useMemo(() => {
    if (!apiTenants) return [];
    
    return (apiTenants || []).filter(tenant => {
      const matchesSearch = tenant.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tenant.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tenant.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tenant.user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !tenantStatusFilter || calculateTenantStatus(tenant) === tenantStatusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [apiTenants, searchQuery, tenantStatusFilter]);

  // Convert API product to internal format
  const convertApiProductToProduct = (apiProduct: AdminProduct): Product => {
    // Calculate total stock from variants
    const totalStock = apiProduct.variants?.reduce((sum, variant) => sum + (variant.stock || 0), 0) || 0;
    
    return {
      id: apiProduct.id,
      tenantId: apiProduct.tenantId,
      name: apiProduct.name,
      description: apiProduct.description || '',
      price: apiProduct.price,
      stock: totalStock,
      category: apiProduct.category,
      sku: apiProduct.sku,
      barcode: apiProduct.sku,
      status: (apiProduct.status?.toLowerCase() || 'pending') as 'active' | 'pending' | 'inactive',
      tenantName: apiProduct.tenant?.businessName || 'Unknown Tenant',
      commissionRate: 15,
      deliveryMethod: 'handover' as const,
      lowStockThreshold: 5,
      createdBy: 'system',
      createdAt: apiProduct.createdAt,
      updatedAt: apiProduct.updatedAt
    };
  };

  // Convert API products to internal format
  const allProducts = useMemo(() => {
    if (loading) return [];
    
    if (selectedArtist) {
      return apiProducts
        .filter(p => p.tenantId === selectedArtist)
        .map(convertApiProductToProduct);
    }
    
    return apiProducts.map(convertApiProductToProduct);
  }, [selectedArtist, apiProducts, loading]);

  // Get products for selected artist
  const artistProducts = useMemo(() => {
    if (!selectedArtist) return [];
    
    if (loading) return [];
    
    return apiProducts
      .filter(p => p.tenantId === selectedArtist)
      .map(convertApiProductToProduct);
  }, [selectedArtist, apiProducts, loading]);
  
  // Calculate artist stats
  const artistStats = useMemo(() => {
    const products = selectedArtist ? artistProducts : allProducts;
    const apiProductsToUse = selectedArtist 
      ? apiProducts.filter(p => p.tenantId === selectedArtist)
      : apiProducts;
    
    const totalProducts = products.length;
    
    // Calculate low stock and out of stock based on variants
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let totalValue = 0;
    
    apiProductsToUse.forEach(apiProduct => {
      if (apiProduct.variants && apiProduct.variants.length > 0) {
        // Check variants for stock status
        const hasLowStock = apiProduct.variants.some(v => v.stock > 0 && v.stock <= 5);
        const hasOutOfStock = apiProduct.variants.some(v => v.stock === 0);
        
        if (hasLowStock) lowStockItems++;
        if (hasOutOfStock) outOfStockItems++;
        
        // Calculate total value from variants
        totalValue += apiProduct.variants.reduce((sum, v) => sum + (v.price * v.stock), 0);
      } else {
        // Fallback to product level if no variants
        const product = products.find(p => p.id === apiProduct.id);
        if (product) {
          if (product.stock > 0 && product.stock <= product.lowStockThreshold) lowStockItems++;
          if (product.stock === 0) outOfStockItems++;
          totalValue += product.price * product.stock;
        }
      }
    });
    
    return { totalProducts, lowStockItems, outOfStockItems, totalValue };
  }, [selectedArtist, artistProducts, allProducts, apiProducts]);

  // Get artists with their stats
  const artistsWithStats = useMemo(() => {
    return mockProducts.reduce((acc, product) => {
      const existing = acc.find(a => a.id === product.tenantId);
      if (existing) {
        existing.productCount++;
        existing.totalValue += product.price * product.stock;
      } else {
        const products = mockProducts.filter(p => p.tenantId === product.tenantId);
        const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        acc.push({
          id: product.tenantId,
          name: product.tenantName,
          productCount: 1,
          totalValue
        });
      }
      return acc;
    }, [] as Array<{ id: string; name: string; productCount: number; totalValue: number }>);
  }, []);

  const handleExport = () => {
    const products = selectedArtist ? artistProducts : allProducts;
    const csvContent = exportProductsToCSV(products);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-${selectedArtist || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csvContent = e.target?.result as string;
        const importedProducts = importProductsFromCSV(csvContent);
        console.log('Imported products:', importedProducts);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              {selectedArtist && (
                <button
                  title="Go back"
                  onClick={() => setSelectedArtist(null)}
                  className="mr-3 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                  {selectedArtist 
                    ? `${apiTenants.find(t => t.id === selectedArtist)?.businessName || 'Artist'} Inventory`
                    : 'Inventory Management'
                  }
                </h1>
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {selectedArtist 
                    ? `Manage products for this artist`
                    : `Total Artists: ${apiTenants.length}`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Total Products
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {artistStats.totalProducts}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Low Stock
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {artistStats.lowStockItems}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Out of Stock
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {artistStats.outOfStockItems}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Total Value
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    ${artistStats.totalValue.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-4 sm:px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab('tenants')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tenants'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Artists
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'approvals'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Approvals
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'products' && (
              <div>
                {/* Search and Filters */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Filter className="h-4 w-4" />
                        Filters
                      </button>
                      <button
                        onClick={handleExport}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded mb-4"></div>
                        <div className="h-6 bg-gray-200 rounded"></div>
                      </div>
                    ))
                  ) : allProducts.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <Package className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {searchQuery ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
                      </p>
                    </div>
                  ) : (
                    allProducts.map((product) => {
                      // Find the corresponding API product to get variant information
                      const apiProduct = apiProducts.find(p => p.id === product.id);
                      const variants = apiProduct?.variants || [];
                      
                      const handleCardClick = () => {
                        setSelectedProductForModal(apiProduct || null);
                        setShowVariantModal(true);
                      };
                      
                      return (
                        <div 
                          key={product.id} 
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={handleCardClick}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 truncate">{product.tenantName}</p>
                          
                          {/* Variants Display */}
                          {variants.length > 0 ? (
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1 mb-2">
                                {variants.slice(0, 2).map((variant, index) => (
                                  <div key={variant.id} className="text-xs">
                                    {variant.color && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 mr-1">
                                        {variant.color}
                                      </span>
                                    )}
                                    {variant.size && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mr-1">
                                        {variant.size}
                                      </span>
                                    )}
                                    <span className="text-green-600 font-medium">${variant.price?.toFixed(2) || '0.00'}</span>
                                    <span className="text-gray-500 ml-1">(Stock: {variant.stock || 0})</span>
                                  </div>
                                ))}
                                {variants.length > 2 && (
                                  <span className="text-xs text-gray-500">+{variants.length - 2} more</span>
                                )}
                              </div>
                              
                              {/* Total Stock and Value */}
                              <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-600">Total Stock: <span className="font-medium">{product.stock}</span></span>
                                  <span className="text-green-600 font-medium">
                                    Total Value: ${variants.reduce((sum, v) => sum + ((v.price || 0) * (v.stock || 0)), 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Base Product Display */
                            <div className="mb-3">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-green-600">${product.price?.toFixed(2) || '0.00'}</span>
                                <span className={`text-sm ${
                                  product.stock <= product.lowStockThreshold ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  Stock: {product.stock}
                                </span>
                              </div>
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Total Value: ${((product.price || 0) * (product.stock || 0)).toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'tenants' && (
              <div>
                {/* Tenant Status Filter */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          placeholder="Search tenants..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        aria-label="Filter by tenant status"
                        value={tenantStatusFilter}
                        onChange={(e) => setTenantStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Status</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Available">Available</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tenants Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artist
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cube
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Products
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Daily Rent
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenantsLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </td>
                          </tr>
                        ))
                      ) : filteredTenants.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 sm:px-6 py-12 text-center">
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No tenants found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No tenants match your current search or filter criteria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((tenant) => {
                          const tenantProducts = apiProducts.filter(p => p.tenantId === tenant.id);
                          const productCount = tenantProducts.length;
                          
                          // Calculate total stock from variants
                          const totalStock = tenantProducts.reduce((sum, p) => {
                            if (p.variants && p.variants.length > 0) {
                              return sum + p.variants.reduce((variantSum, v) => variantSum + (v.stock || 0), 0);
                            }
                            return sum;
                          }, 0);
                          
                          // Calculate total rental value from variants
                          const totalRentalValue = tenantProducts.reduce((sum, p) => {
                            if (p.variants && p.variants.length > 0) {
                              return sum + p.variants.reduce((variantSum, v) => variantSum + (v.price * v.stock), 0);
                            }
                            return sum;
                          }, 0);

                          return (
                            <tr 
                              key={tenant.id} 
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() => router.push(`/inventory/products/${tenant.id}`)}
                            >
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="flex-shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                      <User className="h-5 w-5 text-blue-600" />
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {tenant.businessName}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {tenant.user.name} • {tenant.user.email}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {tenant.user.phone}
                                    </div>
                                    {tenant.address && (
                                      <div className="text-xs text-gray-400 truncate max-w-xs">
                                        {tenant.address}
                                      </div>
                                    )}
                                    {tenant.notes && (
                                      <div className="text-xs text-blue-600 font-medium">
                                        {tenant.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <div>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(calculateTenantStatus(tenant))}`}>
                                    {getStatusDisplayText(calculateTenantStatus(tenant))}
                                  </span>
                                  {tenant.rentals.length > 0 && (
                                    <div className="mt-1">
                                      <div className="text-xs text-gray-500">
                                        Start: {new Date(tenant.rentals[0].startDate).toLocaleDateString()}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        End: {new Date(tenant.rentals[0].endDate).toLocaleDateString()}
                                      </div>
                                      {tenant.rentals[0].lastPayment && (
                                        <div className="text-xs text-gray-400">
                                          Last Payment: {new Date(tenant.rentals[0].lastPayment).toLocaleDateString()}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                {tenant.rentals.length > 0 ? (
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {tenant.rentals[0].cube.code}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {tenant.rentals[0].cube.size} • ${tenant.rentals[0].cube.pricePerDay}/day
                                    </div>
                                    <div className="text-xs text-gray-400">
                                      Status: {tenant.rentals[0].cube.status}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {productCount}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {totalStock}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${tenant.rentals.length > 0 ? tenant.rentals[0].dailyRent?.toLocaleString() || '0' : '0'}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${totalRentalValue.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'approvals' && (
              <div>
                {/* Search and Refresh */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          placeholder="Search by name, SKU, or tenant..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadAdminProducts()}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAdminProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.sku}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.tenant?.businessName}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              product.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              product.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {product.status === 'APPROVED' ? 'Approved' :
                               product.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {product.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproval(product.id, true)}
                                  disabled={approvalLoading === product.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                >
                                  {approvalLoading === product.id ? 'Loading...' : 'Approve'}
                                </button>
                                <button
                                  onClick={() => handleApproval(product.id, false)}
                                  disabled={approvalLoading === product.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                >
                                  {approvalLoading === product.id ? 'Loading...' : 'Reject'}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {filteredAdminProducts.map((product) => (
                    <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900">{product.name}</h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          product.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.status === 'APPROVED' ? 'Approved' :
                           product.status === 'REJECTED' ? 'Rejected' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">SKU: {product.sku}</p>
                      <p className="text-sm text-gray-500 mb-3">Tenant: {product.tenant?.businessName}</p>
                      {product.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproval(product.id, true)}
                            disabled={approvalLoading === product.id}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {approvalLoading === product.id ? 'Loading...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleApproval(product.id, false)}
                            disabled={approvalLoading === product.id}
                            className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
                          >
                            {approvalLoading === product.id ? 'Loading...' : 'Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
                          {/* Variant Image */}
                          <div className="mb-3">
                            {variantImageLoading[variant.id] ? (
                              <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                              </div>
                            ) : variantImages[variant.id] ? (
                              <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden">
                                <Image
                                  src={variantImages[variant.id]}
                                  alt={`${variant.color || ''} ${variant.size || ''} variant`}
                                  width={400}
                                  height={400}
                                  className="object-contain w-full h-auto max-h-96"
                                  onError={() => {
                                    setVariantImages(prev => ({ ...prev, [variant.id]: '' }));
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                                <span className="ml-2 text-sm text-gray-500">No image</span>
                              </div>
                            )}
                          </div>

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
      {showBarcodeModal && selectedVariantForBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Barcode for {selectedVariantForBarcode.color} {selectedVariantForBarcode.size}
                </h2>
                <button
                  onClick={closeBarcodeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Barcode Search Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Barcode Lookup</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeSearchTerm}
                    onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                    placeholder="Enter barcode to search..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && searchBarcode(barcodeSearchTerm)}
                  />
                  <button
                    onClick={() => searchBarcode(barcodeSearchTerm)}
                    disabled={barcodeSearchLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {barcodeSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {/* Search Results */}
                {barcodeSearchResult && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h4 className="font-semibold text-gray-900 mb-2">Search Result:</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="font-medium">Product:</span> {barcodeSearchResult.productName}</div>
                      <div><span className="font-medium">Category:</span> {barcodeSearchResult.category}</div>
                      <div><span className="font-medium">Color:</span> {barcodeSearchResult.color}</div>
                      <div><span className="font-medium">Size:</span> {barcodeSearchResult.size}</div>
                      <div><span className="font-medium">Price:</span> ${barcodeSearchResult.price}</div>
                      <div><span className="font-medium">Stock:</span> {barcodeSearchResult.stock}</div>
                      <div><span className="font-medium">Barcode:</span> {barcodeSearchResult.barcode}</div>
                      <div><span className="font-medium">Tenant:</span> {barcodeSearchResult.tenant?.businessName}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Variant Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Variant Details</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">SKU:</span>
                      <div className="font-medium">{selectedVariantForBarcode.sku}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Barcode:</span>
                      <div className="font-medium">{selectedVariantForBarcode.barcode}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <div className="font-medium text-green-600">${selectedVariantForBarcode.price?.toFixed(2)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Stock:</span>
                      <div className="font-medium">{selectedVariantForBarcode.stock}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Color:</span>
                      <div className="font-medium">{selectedVariantForBarcode.color}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Size:</span>
                      <div className="font-medium">{selectedVariantForBarcode.size}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Image */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Barcode Image</h3>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {barcodeLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-gray-600">Loading barcode...</span>
                    </div>
                  ) : barcodeImageUrl ? (
                    <div>
                      <img 
                        src={barcodeImageUrl} 
                        alt="Barcode" 
                        className="mx-auto max-w-full h-auto border rounded"
                        style={{ maxHeight: '200px' }}
                      />
                      <p className="mt-2 text-sm text-gray-600">Barcode for {selectedVariantForBarcode.barcode}</p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2">Failed to load barcode image</p>
                    </div>
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
        </div>
      )}
    </div>
  );
}