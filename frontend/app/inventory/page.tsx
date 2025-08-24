'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  DollarSign
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
import Navigation from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function InventoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  // Calculate tenant status based on rental dates and status (synced with admin logic)
  const calculateTenantStatus = (tenant: AdminTenant): "Upcoming" | "Active" | "Inactive" | "Available" => {
    if (!tenant.rentals || tenant.rentals.length === 0) {
      return "Available"; // No rentals - tenant is approved but hasn't rented any cube
    }
    
    // Get the most recent active rental or the first one
    const activeRental = tenant.rentals.find(rental => rental.status === "ACTIVE") || tenant.rentals[0];
    
    if (!activeRental) return "Available";
    
    const now = new Date();
    const startDate = new Date(activeRental.startDate);
    const endDate = new Date(activeRental.endDate);
    
    if (activeRental.status === "ACTIVE" && now >= startDate && now <= endDate) {
      return "Active"; // Currently renting and within rental period
    } else if (now < startDate) {
      return "Upcoming"; // Has rental but start date is in future
    } else {
      return "Inactive"; // Rental period has ended
    }
  };

  // Load API tenants
  const loadApiTenants = async () => {
    try {
      setTenantsLoading(true);
      const tenants = await adminTenantService.getAllTenants();
      console.log('Successfully fetched tenants:', tenants.length, 'items');
      
      // Add calculated status to each tenant
      const tenantsWithStatus = tenants.map(tenant => ({
        ...tenant,
        calculatedStatus: calculateTenantStatus(tenant)
      }));
      
      setApiTenants(tenantsWithStatus);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setTenantsLoading(false);
    }
  };

  useEffect(() => {
    loadAllProducts();
    loadApiTenants();
  }, []);

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
  const convertApiProductToProduct = (apiProduct: AdminProduct): Product => ({
    id: apiProduct.id,
    tenantId: apiProduct.tenantId,
    name: apiProduct.name,
    description: apiProduct.description || '',
    price: apiProduct.price,
    stock: apiProduct.stock,
    category: apiProduct.category,
    sku: apiProduct.sku,
    barcode: apiProduct.sku,
    status: apiProduct.status.toLowerCase() as 'active' | 'pending' | 'inactive',
    tenantName: apiProduct.tenant.businessName,
    commissionRate: 15,
    deliveryMethod: 'handover' as const,
    lowStockThreshold: 5,
    createdBy: 'system',
    createdAt: apiProduct.createdAt,
    updatedAt: apiProduct.updatedAt
  });

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
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold).length;
    const outOfStockItems = products.filter(p => p.stock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    return { totalProducts, lowStockItems, outOfStockItems, totalValue };
  }, [selectedArtist, artistProducts, allProducts]);

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
                    allProducts.map((product) => (
                      <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-sm font-medium text-gray-900 truncate">{product.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' :
                            product.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 truncate">{product.tenantName}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">${product.price}</span>
                          <span className={`text-sm ${
                            product.stock <= product.lowStockThreshold ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            Stock: {product.stock}
                          </span>
                        </div>
                      </div>
                    ))
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
                          const productCount = apiProducts.filter(p => p.tenantId === tenant.id).length;
                          const totalStock = apiProducts
                            .filter(p => p.tenantId === tenant.id)
                            .reduce((sum, p) => sum + p.stock, 0);
                          const totalRentalValue = apiProducts
                            .filter(p => p.tenantId === tenant.id)
                            .reduce((sum, p) => sum + (p.price * p.stock), 0);

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
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    calculateTenantStatus(tenant) === 'Active' ? 'bg-green-100 text-green-800' :
                                    calculateTenantStatus(tenant) === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                                    calculateTenantStatus(tenant) === 'Inactive' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
{calculateTenantStatus(tenant)}
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
          </div>
        </div>
      </div>
    </div>
  );
}