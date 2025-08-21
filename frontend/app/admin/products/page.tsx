'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import { getRolePermissions } from '@/data/mockAuth';
import { mockProducts, mockCategories, getProductsByCategory, searchProducts } from '@/data/mockProducts';
import { Product, Category } from '@/types/product';
import { adminProductService, AdminProduct } from '@/services/adminProductService';
import { Search, Filter, Upload, Download, Edit, Trash2, Eye, Package, AlertTriangle, TrendingUp, DollarSign, Users, RefreshCw, Check, X } from 'lucide-react';

type AdminProductTabType = 'products' | 'approvals' | 'logs';

const AdminProducts = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminProductTabType>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [filteredAdminProducts, setFilteredAdminProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

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

      setProducts(mockProducts);
      setFilteredProducts(mockProducts);
      setCategories(mockCategories);
      
      // Load admin products for approval
      loadAdminProducts();
    }
  }, [user, isLoading, router]);

  const loadAdminProducts = async () => {
    try {
      setLoading(true);
      const adminProductsData = await adminProductService.getProducts(selectedTenantId || undefined);
      
      // If no data from API, use mock data for testing
      if (!adminProductsData || adminProductsData.length === 0) {
        const mockAdminProducts: AdminProduct[] = [
          
        ];
        setAdminProducts(mockAdminProducts);
        setFilteredAdminProducts(mockAdminProducts);
      } else {
        setAdminProducts(adminProductsData);
        setFilteredAdminProducts(adminProductsData);
      }
    } catch (error) {
      console.error('Error loading admin products:', error);
      // Fallback to mock data for testing
      const mockAdminProducts: AdminProduct[] = [
        {
          id: 'admin-1',
          tenantId: 'T001',
          name: 'Handmade Ceramic Mug',
          description: 'Beautiful handcrafted ceramic mug with unique glaze pattern',
          price: 25.99,
          stock: 15,
          category: 'accessories',
          sku: 'MUG-001',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenant: {
            id: 'T001',
            businessName: 'Artisan Crafts Co.'
          },
          logs: []
        },
        {
          id: 'admin-2',
          tenantId: 'T002',
          name: 'Vintage Style Earrings',
          description: 'Elegant vintage-inspired earrings with antique finish',
          price: 18.50,
          stock: 8,
          category: 'earrings',
          sku: 'EAR-002',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          tenant: {
            id: 'T002',
            businessName: 'Vintage Jewelry Studio'
          },
          logs: []
        }
      ];
      setAdminProducts(mockAdminProducts);
      setFilteredAdminProducts(mockAdminProducts);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (productId: string, approve: boolean) => {
    try {
      setApprovalLoading(productId);
      await adminProductService.approveProduct(productId, approve);
      
      // Reload products after approval
      await loadAdminProducts();
      
      // Show success message
      alert(`Product ${approve ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating approval:', error);
      alert(`Failed to ${approve ? 'approve' : 'reject'} product. Please try again.`);
    } finally {
      setApprovalLoading(null);
    }
  };

  useEffect(() => {
    let filtered = products;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      const lowercaseQuery = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.barcode.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.tenantName.toLowerCase().includes(lowercaseQuery)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchTerm]);

  useEffect(() => {
    let filtered = adminProducts;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Search filter
    if (searchTerm) {
      const lowercaseQuery = searchTerm.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(lowercaseQuery) ||
        product.sku.toLowerCase().includes(lowercaseQuery) ||
        product.category.toLowerCase().includes(lowercaseQuery) ||
        product.tenant.businessName.toLowerCase().includes(lowercaseQuery)
      );
    }

    setFilteredAdminProducts(filtered);
  }, [adminProducts, selectedCategory, searchTerm]);

  useEffect(() => {
    if (selectedTenantId) {
      loadAdminProducts();
    }
  }, [selectedTenantId]);

  const handleBatchUpload = () => {
    if (!uploadFile) return;

    // Simulate file processing
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        const lines = csvData.split('\n');
        const headers = lines[0].split(',');
        
        // Simulate processing CSV data
        const newProducts: Product[] = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) { // Process max 5 rows for demo
          const values = lines[i].split(',');
          if (values.length >= 4) {
            const newProduct: Product = {
              id: `batch-${Date.now()}-${i}`,
              barcode: `BATCH${Date.now()}${i}`,
              name: values[0]?.replace(/"/g, '') || `Product ${i}`,
              price: parseFloat(values[2]) || 10.00,
              stock: parseInt(values[3]) || 10,
              category: values[1] || 'Stickers',
              tenantId: 'T001',
              tenantName: 'Batch Upload Tenant',
              description: `Batch uploaded product: ${values[0]?.replace(/"/g, '') || `Product ${i}`}`,
              status: 'active' as const,
              commissionRate: 15,
              deliveryMethod: 'handover' as const,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: user?.id || 'admin',
              lowStockThreshold: 5,
              sku: `SKU-${Date.now()}-${i}`,
              weight: 0.1,
              dimensions: { length: 10, width: 10, height: 2 },
              tags: ['batch-upload']
            };
            newProducts.push(newProduct);
          }
        }

        // Add new products to the list
        setProducts(prev => [...prev, ...newProducts]);
        setShowBatchUpload(false);
        setUploadFile(null);
        alert(`Successfully uploaded ${newProducts.length} products!`);
      } catch (error) {
        alert('Error processing file. Please check the format.');
      }
    };
    reader.readAsText(uploadFile);
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Category,Price,Stock\n" +
      "Sample Product 1,stickers,15.99,25\n" +
      "Sample Product 2,earrings,29.99,10\n" +
      "Sample Product 3,accessories,12.50,30";
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProducts = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Name,Category,Price,Stock,Barcode,Tenant ID,Tenant Name,Commission Rate,Status,Created At\n" +
      filteredProducts.map(product => 
        `"${product.name}",${product.category},${product.price},${product.stock},${product.barcode},${product.tenantId},"${product.tenantName}",${product.commissionRate},${product.status},${product.createdAt}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products_${selectedCategory}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'text-red-600', text: 'Out of Stock' };
    if (stock <= 5) return { color: 'text-yellow-600', text: 'Low Stock' };
    return { color: 'text-green-600', text: 'In Stock' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage inventory, categories, and product listings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Products</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">{products.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Active Products</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Low Stock</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.stock <= 5 && p.stock > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Out of Stock</p>
                <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                  {products.filter(p => p.stock === 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col space-y-4">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'products'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Products
                </button>
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'approvals'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Approvals
                </button>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'logs'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Product Logs
                </button>
              </nav>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name} ({activeTab === 'approvals' ? filteredAdminProducts.filter(p => p.category === category.name).length : products.filter(p => p.category === category.name).length})
                    </option>
                  ))}
                </select>
              </div>
              
              {activeTab === 'approvals' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Tenant</label>
                  <input
                    type="text"
                    placeholder="Enter Tenant ID (optional)"
                    value={selectedTenantId}
                    onChange={(e) => setSelectedTenantId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder={activeTab === 'approvals' ? "Search by name, SKU, or tenant..." : "Search by name, barcode, or artist..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {activeTab === 'products' ? (
                <>
                  <button
                    onClick={() => setShowBatchUpload(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Batch Upload
                  </button>
                  <button
                    onClick={exportProducts}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Excel
                  </button>
                </>
              ) : activeTab === 'approvals' ? (
                <button
                  onClick={() => loadAdminProducts()}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  ) : (
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                  Refresh Approvals
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {activeTab === 'approvals' ? 'Product Approvals' : activeTab === 'logs' ? 'Product Logs' : 'Products'} ({activeTab === 'approvals' ? filteredAdminProducts.length : filteredProducts.length} items)
            </h3>
          </div>
          
          {activeTab === 'approvals' ? (
            /* Admin Products Approval Table */
            filteredAdminProducts.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAdminProducts.map((product) => (
                        <tr 
                          key={product.id} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/admin/products/${product.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">{product.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {product.imageUrl ? (
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {product.variants && product.variants.length > 0 ? (
                                <div>
                                  <div className="font-medium">{product.variants.length} variant(s)</div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {product.variants.slice(0, 2).map((variant, idx) => (
                                      <div key={idx}>
                                        {variant.color} {variant.size} - ${variant.price}
                                      </div>
                                    ))}
                                    {product.variants.length > 2 && (
                                      <div className="text-blue-600">+{product.variants.length - 2} more</div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="font-medium">Base Product</div>
                                  <div className="text-xs text-gray-500">${product.price.toFixed(2)}</div>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.tenant.businessName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                              {product.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {product.status === 'PENDING' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproval(product.id, true);
                                }}
                                disabled={approvalLoading === product.id}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                              >
                                {approvalLoading === product.id ? (
                                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                ) : (
                                  <Check className="w-3 h-3 mr-1" />
                                )}
                                Approve
                              </button>
                            ) : (
                              <span className="text-gray-500 text-xs">
                                {product.status === 'APPROVED' ? 'Already Approved' : 'Already Rejected'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Cards for Admin Products */}
                <div className="lg:hidden">
                  {filteredAdminProducts.map((product) => (
                    <div 
                      key={product.id} 
                      className="border-b border-gray-200 p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start space-x-3 flex-1 min-w-0">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                            <p className="text-xs text-gray-500 mt-1 truncate">{product.description}</p>
                          </div>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)} ml-2 flex-shrink-0`}>
                          {product.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {product.category}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Variants</p>
                          <div className="text-xs text-gray-900">
                            {product.variants && product.variants.length > 0 ? (
                              <div>
                                {product.variants.slice(0, 2).map((variant, index) => (
                                  <div key={index} className="mb-1">
                                    {variant.color} {variant.size} - ${variant.price}
                                  </div>
                                ))}
                                {product.variants.length > 2 && (
                                  <div className="text-gray-500">+{product.variants.length - 2} more</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">No variants</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500">Tenant</p>
                          <p className="text-sm text-gray-900 truncate">{product.tenant.businessName}</p>
                        </div>
                      </div>
                      
                      {product.status === 'PENDING' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproval(product.id, true);
                          }}
                          disabled={approvalLoading === product.id}
                          className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {approvalLoading === product.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </button>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-gray-500 text-sm">
                            {product.status === 'APPROVED' ? 'Already Approved' : 'Already Rejected'}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products pending approval</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {loading ? 'Loading products...' : 'All products have been reviewed or no products match your filters.'}
                </p>
              </div>
            )
          ) : activeTab === 'logs' ? (
            /* Product Logs Table */
            adminProducts.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Change Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Previous Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          New Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Changed By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {adminProducts.flatMap(product => 
                        product.logs?.map((log, index) => (
                          <tr key={`${product.id}-${index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.tenant.businessName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                log.changeType === 'SUBMISSION' ? 'bg-blue-100 text-blue-800' :
                                log.changeType === 'PRICE_UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                log.changeType === 'STOCK_UPDATE' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.changeType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.previousValue || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.newValue || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                               {log.user?.name || 'System'}
                             </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(log.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        )) || []
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Cards for Product Logs */}
                <div className="lg:hidden">
                  {adminProducts.flatMap(product => 
                    product.logs?.map((log, index) => (
                      <div key={`${product.id}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                            <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                            <p className="text-xs text-gray-500">{product.tenant.businessName}</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            log.changeType === 'SUBMISSION' ? 'bg-blue-100 text-blue-800' :
                            log.changeType === 'PRICE_UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                            log.changeType === 'STOCK_UPDATE' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {log.changeType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-gray-500">Previous Value</p>
                            <p className="text-gray-900">{log.previousValue || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">New Value</p>
                            <p className="text-gray-900">{log.newValue || 'N/A'}</p>
                          </div>
                          <div>
                             <p className="text-gray-500">Changed By</p>
                             <p className="text-gray-900">{log.user?.name || 'System'}</p>
                           </div>
                          <div>
                            <p className="text-gray-500">Date & Time</p>
                            <p className="text-gray-900">{new Date(log.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )) || []
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No product logs found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Product change logs will appear here when products are modified.
                </p>
              </div>
            )
          ) : (
            /* Regular Products Table */
            filteredProducts.length > 0 ? (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => {
                      const stockStatus = getStockStatus(product.stock);
                      return (
                        <tr key={product.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500">Barcode: {product.barcode}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${product.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{product.stock} units</div>
                            <div className={`text-xs ${stockStatus.color}`}>{stockStatus.text}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {product.tenantName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                              {product.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Cards */}
              <div className="lg:hidden">
                {filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock);
                  return (
                    <div key={product.id} className="border-b border-gray-200 p-4 sm:p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{product.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">Barcode: {product.barcode}</p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)} ml-2`}>
                          {product.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-500">Category</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {product.category}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Price</p>
                          <p className="text-sm font-medium text-gray-900">${product.price.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Stock</p>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.stock} units</p>
                            <p className={`text-xs ${stockStatus.color}`}>{stockStatus.text}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tenant</p>
                          <p className="text-sm text-gray-900 truncate">{product.tenantName}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Get started by uploading your first batch of products.'
                }
              </p>
            </div>
          )
          )}
        </div>
      </div>

      {/* Batch Upload Modal */}
      {showBatchUpload && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Batch Upload Products</h3>
                <button
                  onClick={() => setShowBatchUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Upload a CSV file with product information. Download the template to see the required format.
                </p>
                
                <button
                  onClick={downloadTemplate}
                  className="w-full mb-3 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                >
                  Download CSV Template
                </button>
                
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBatchUpload(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchUpload}
                  disabled={!uploadFile}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProducts;