"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  RefreshCw,
  Check,
  X,
  TrendingUp,
} from "lucide-react";
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
  getProductsByTenant,
} from "@/data/mockProducts";

import {
  Product,
  InventoryChange,
  DeliveryLog,
  InventoryFilter,
} from "@/types/product";
import {
  adminProductService,
  AdminProduct,
} from "@/services/adminProductService";
import { adminTenantService, AdminTenant } from "@/services/adminTenantService";
import { authService } from "@/services/authService";
import { tenantPortalService } from "@/services/tenantPortalService";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  calculateTenantStatus,
  getStatusColorClass,
  getStatusDisplayText,
  updateTenantRentalStatuses,
  TenantStatus,
} from "@/utils/tenantStatus";
import type { TenantWithRentals } from "@/utils/tenantStatus";

// Extended type for AdminTenant with calculated status
type AdminTenantWithStatus = AdminTenant & {
  calculatedStatus: TenantStatus;
};

export default function InventoryPage() {
  const { user } = useAuth();

  // Barcode API functions
  const fetchBarcodeImage = async (variantId: string) => {
    setBarcodeLoading(true);
    try {
      const token = authService.getAuthToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      const baseUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api`
          : "https://cornven.vercel.app/api";

      const response = await fetch(
        `${baseUrl}/variants/${variantId}/barcode.png`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch barcode image");
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setBarcodeImageUrl(imageUrl);
    } catch (error) {
      console.error("Error fetching barcode:", error);
      alert("Failed to load barcode image");
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
        throw new Error("No authentication token found");
      }

      const baseUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api`
          : "https://cornven.vercel.app/api";

      const response = await fetch(
        `${baseUrl}/variants/lookup?barcode=${encodeURIComponent(barcode)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Barcode not found");
      }

      const result = await response.json();
      setBarcodeSearchResult(result);
    } catch (error) {
      console.error("Error searching barcode:", error);
      setBarcodeSearchResult(null);
      alert("Barcode not found or error occurred");
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
    setBarcodeImageUrl("");
    setBarcodeSearchTerm("");
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

  const fetchProductImage = async (product: AdminProduct) => {
    const productId = product.id;
    if (productImages[productId] || productImageLoading[productId]) {
      return; // Already loaded or loading
    }

    console.log("Fetching image for product:", productId);
    setProductImageLoading((prev) => ({ ...prev, [productId]: true }));
    try {
      // Use the first variant's image as the product image
      if (product.variants && product.variants.length > 0) {
        const firstVariantId = product.variants[0].id;
        console.log("Using first variant ID for product image:", firstVariantId);
        const response = await tenantPortalService.getVariantImageUrlSafe(
          firstVariantId
        );
        console.log("Product image response:", response);
        if (response && response.url) {
          setProductImages((prev) => ({ ...prev, [productId]: response.url }));
        } else {
          console.warn(`No image URL available for product ${productId}`);
          setProductImages((prev) => ({ ...prev, [productId]: "No image" }));
        }
      } else {
        console.warn(`No variants available for product ${productId}`);
        setProductImages((prev) => ({ ...prev, [productId]: "No image" }));
      }
    } catch (error) {
      console.error("Error fetching product image:", error);
      // Set a placeholder or error state
      setProductImages((prev) => ({ ...prev, [productId]: "" }));
    } finally {
      setProductImageLoading((prev) => ({ ...prev, [productId]: false }));
    }
  };
  const router = useRouter();
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(
    null
  );
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] =
    useState<AdminProduct | null>(null);

  // Fetch variant images when modal opens
  useEffect(() => {
    if (showVariantModal && selectedProductForModal && selectedProductForModal.variants) {
      selectedProductForModal.variants.forEach(variant => {
        fetchVariantImage(variant.id);
      });
    }
  }, [showVariantModal, selectedProductForModal]);

  // Fetch product image when product details modal opens
  useEffect(() => {
    if (showProductDetails && selectedProduct) {
      fetchProductImage(selectedProduct);
    }
  }, [showProductDetails, selectedProduct]);

  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedVariantForBarcode, setSelectedVariantForBarcode] =
    useState<any>(null);
  const [barcodeImageUrl, setBarcodeImageUrl] = useState<string>("");
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeSearchTerm, setBarcodeSearchTerm] = useState("");
  const [barcodeSearchResult, setBarcodeSearchResult] = useState<any>(null);
  const [barcodeSearchLoading, setBarcodeSearchLoading] = useState(false);
  const [variantSearchTerm, setVariantSearchTerm] = useState("");
  const [variantImages, setVariantImages] = useState<{ [key: string]: string }>(
    {}
  );
  const [variantImageLoading, setVariantImageLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [productImages, setProductImages] = useState<{ [key: string]: string }>(
    {}
  );
  const [productImageLoading, setProductImageLoading] = useState<{
    [key: string]: boolean;
  }>({});

  // Enhanced filtering states for product approval
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTenantId, setSelectedTenantId] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [apiProducts, setApiProducts] = useState<AdminProduct[]>([]);
  const [apiTenants, setApiTenants] = useState<AdminTenantWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<InventoryFilter>({
    category: "",
    tenantId: "",
    stockStatus: "",
    priceRange: { min: undefined, max: undefined },
  });

  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("");
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([]);
  const [filteredAdminProducts, setFilteredAdminProducts] = useState<
    AdminProduct[]
  >([]);
  const [approvalLoading, setApprovalLoading] = useState<string | null>(null);

  // Load API products
  const loadApiProducts = async () => {
    try {
      setLoading(true);
      const products = await adminProductService.getAllProducts();
      console.log("Successfully fetched products:", products.length, "items");
      setApiProducts(products);
    } catch (error) {
      console.error("Error loading products:", error);
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
      console.log("Successfully fetched tenants:", tenants.length, "items");

      // Update rental statuses dynamically on frontend
      const tenantsWithUpdatedStatuses = updateTenantRentalStatuses(
        tenants as TenantWithRentals[]
      );

      // Add calculated status to each tenant
      const tenantsWithStatus: AdminTenantWithStatus[] =
        tenantsWithUpdatedStatuses.map((tenant: TenantWithRentals) => ({
          ...(tenant as AdminTenant),
          calculatedStatus: calculateTenantStatus({
            ...tenant,
            rentals: tenant.rentals || [],
          }),
        }));

      setApiTenants(tenantsWithStatus);
    } catch (error) {
      console.error("Error loading tenants:", error);
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
      console.error("Error loading admin products:", error);
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
      console.error("Error updating approval:", error);
      alert("Failed to update approval status");
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
    if (activeTab === "approvals") {
      loadAdminProducts();
    }
  }, [activeTab]);

  // Filter admin products based on search and status
  useEffect(() => {
    let filtered = adminProducts;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.tenant?.businessName
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (approvalStatusFilter !== "all") {
      filtered = filtered.filter((product) => {
        if (approvalStatusFilter === "pending") {
          return product.status === "PENDING" || !product.status;
        }
        return product.status === approvalStatusFilter;
      });
    }

    setFilteredAdminProducts(filtered);
  }, [adminProducts, searchQuery, approvalStatusFilter]);

  // Filter tenants based on search and status
  const filteredTenants = useMemo(() => {
    if (!apiTenants) return [];

    return (apiTenants || []).filter((tenant) => {
      const matchesSearch =
        tenant.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.user.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        !tenantStatusFilter ||
        calculateTenantStatus(tenant) === tenantStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [apiTenants, searchQuery, tenantStatusFilter]);

  // Convert API product to internal format
  const convertApiProductToProduct = (apiProduct: AdminProduct): Product => {
    // Calculate total stock from variants
    const totalStock =
      apiProduct.variants?.reduce(
        (sum, variant) => sum + (variant.stock || 0),
        0
      ) || 0;

    return {
      id: apiProduct.id,
      tenantId: apiProduct.tenantId,
      name: apiProduct.name,
      description: apiProduct.description || "",
      price: apiProduct.price,
      stock: totalStock,
      category: apiProduct.category,
      sku: apiProduct.sku,
      barcode: apiProduct.sku,
      imageUrl: apiProduct.imageUrl,
      status: (apiProduct.status?.toLowerCase() || "pending") as
        | "active"
        | "pending"
        | "inactive",
      tenantName: apiProduct.tenant?.businessName || "Unknown Tenant",
      commissionRate: 15,
      deliveryMethod: "handover" as const,
      lowStockThreshold: 5,
      createdBy: "system",
      createdAt: apiProduct.createdAt,
      updatedAt: apiProduct.updatedAt,
    };
  };

  // Convert API products to internal format with enhanced filtering
  const allProducts = useMemo(() => {
    if (loading) return [];

    let filteredProducts = apiProducts;

    // Apply artist filter
    if (selectedArtist) {
      filteredProducts = filteredProducts.filter(
        (p) => p.tenantId === selectedArtist
      );
    }

    // Apply category filter
    if (selectedCategory !== "all") {
      filteredProducts = filteredProducts.filter(
        (p) => p.category === selectedCategory
      );
    }

    // Apply tenant filter
    if (selectedTenantId !== "all") {
      filteredProducts = filteredProducts.filter(
        (p) => p.tenantId === selectedTenantId
      );
    }

    // Apply status filter
    if (filterStatus !== "all") {
      filteredProducts = filteredProducts.filter((p) => {
        if (p.variants && p.variants.length > 0) {
          // Check variant-level status
          return p.variants.some((v) => v.status === filterStatus);
        }
        // Fallback to product-level status
        return p.status === filterStatus;
      });
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredProducts = filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.category && p.category.toLowerCase().includes(query)) ||
          (p.tenant?.businessName &&
            p.tenant.businessName.toLowerCase().includes(query))
      );
    }

    // Convert to internal format
    let products = filteredProducts.map(convertApiProductToProduct);

    // Apply sorting
    products.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "price":
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case "stock":
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case "category":
          aValue = a.category?.toLowerCase() || "";
          bValue = b.category?.toLowerCase() || "";
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc"
          ? (aValue as number) - (bValue as number)
          : (bValue as number) - (aValue as number);
      }
    });

    return products;
  }, [
    selectedArtist,
    apiProducts,
    loading,
    selectedCategory,
    selectedTenantId,
    filterStatus,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Get products for selected artist
  const artistProducts = useMemo(() => {
    if (!selectedArtist) return [];

    if (loading) return [];

    return apiProducts
      .filter((p) => p.tenantId === selectedArtist)
      .map(convertApiProductToProduct);
  }, [selectedArtist, apiProducts, loading]);

  // Calculate artist stats
  const artistStats = useMemo(() => {
    const products = selectedArtist ? artistProducts : allProducts;
    const apiProductsToUse = selectedArtist
      ? apiProducts.filter((p) => p.tenantId === selectedArtist)
      : apiProducts;

    const totalProducts = products.length;

    // Calculate low stock and out of stock based on variants
    let lowStockItems = 0;
    let outOfStockItems = 0;
    let totalValue = 0;

    apiProductsToUse.forEach((apiProduct) => {
      if (apiProduct.variants && apiProduct.variants.length > 0) {
        // Check variants for stock status
        const hasLowStock = apiProduct.variants.some(
          (v) => v.stock > 0 && v.stock <= 5
        );
        const hasOutOfStock = apiProduct.variants.some((v) => v.stock === 0);

        if (hasLowStock) lowStockItems++;
        if (hasOutOfStock) outOfStockItems++;

        // Calculate total value from variants
        totalValue += apiProduct.variants.reduce(
          (sum, v) => sum + (v.price || 0) * (v.stock || 0),
          0
        );
      } else {
        // Fallback to product level if no variants
        const product = products.find((p) => p.id === apiProduct.id);
        if (product) {
          if (product.stock > 0 && product.stock <= product.lowStockThreshold)
            lowStockItems++;
          if (product.stock === 0) outOfStockItems++;
          totalValue += (product.price || 0) * (product.stock || 0);
        }
      }
    });

    // Calculate approval-related stats
    let approvedProducts = 0;
    let activeProducts = 0;
    let pendingProducts = 0;
    let rejectedProducts = 0;

    apiProductsToUse.forEach((apiProduct) => {
      // Check product approval status based on variants
      if (apiProduct.variants && apiProduct.variants.length > 0) {
        const hasApprovedVariants = apiProduct.variants.some(
          (v) => v.status === "APPROVED"
        );
        const hasPendingVariants = apiProduct.variants.some(
          (v) => v.status === "PENDING"
        );
        const hasRejectedVariants = apiProduct.variants.some(
          (v) => v.status === "REJECTED"
        );

        if (hasApprovedVariants) {
          approvedProducts++;
          // Count approved variants as active if they have stock
          if (
            apiProduct.variants.some(
              (v) => v.status === "APPROVED" && v.stock > 0
            )
          ) {
            activeProducts++;
          }
        }
        if (hasPendingVariants) pendingProducts++;
        if (hasRejectedVariants) rejectedProducts++;
      } else {
        // Fallback to product level status
        const product = products.find((p) => p.id === apiProduct.id);
        if (product) {
          // Map product status to approval categories
          if (product.status === "active") {
            approvedProducts++;
            if (product.stock > 0) activeProducts++;
          }
          if (product.status === "pending") pendingProducts++;
          if (product.status === "inactive") rejectedProducts++;
        }
      }
    });

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalValue,
      approvedProducts,
      activeProducts,
      pendingProducts,
      rejectedProducts,
    };
  }, [selectedArtist, artistProducts, allProducts, apiProducts]);

  // Get artists with their stats
  const artistsWithStats = useMemo(() => {
    return mockProducts.reduce((acc, product) => {
      const existing = acc.find((a) => a.id === product.tenantId);
      if (existing) {
        existing.productCount++;
        existing.totalValue += product.price * product.stock;
      } else {
        const products = mockProducts.filter(
          (p) => p.tenantId === product.tenantId
        );
        const totalValue = products.reduce(
          (sum, p) => sum + p.price * p.stock,
          0
        );
        acc.push({
          id: product.tenantId,
          name: product.tenantName,
          productCount: 1,
          totalValue,
        });
      }
      return acc;
    }, [] as Array<{ id: string; name: string; productCount: number; totalValue: number }>);
  }, []);

  const handleExport = () => {
    const products = selectedArtist ? artistProducts : allProducts;
    const csvContent = exportProductsToCSV(products);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${selectedArtist || "all"}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
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
        console.log("Imported products:", importedProducts);
      };
      reader.readAsText(file);
    }
  };

  // Helper function to get variant status counts for a product
  const getVariantStatusCounts = (variants: any[]) => {
    const counts = {
      approved: 0,
      active: 0,
      pending: 0,
      rejected: 0,
      total: variants.length,
    };

    variants.forEach((variant) => {
      switch (variant.status) {
        case "APPROVED":
          counts.approved++;
          // Count approved variants with stock as active
          if (variant.stock > 0) {
            counts.active++;
          }
          break;
        case "PENDING":
          counts.pending++;
          break;
        case "REJECTED":
          counts.rejected++;
          break;
      }
    });

    return counts;
  };

  // Helper function to render variant status badges
  const renderVariantStatusBadges = (variants: any[]) => {
    const counts = getVariantStatusCounts(variants);

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {counts.approved > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Check className="w-3 h-3 mr-1" />
            {counts.approved} Approved
          </span>
        )}
        {counts.active > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <TrendingUp className="w-3 h-3 mr-1" />
            {counts.active} Active
          </span>
        )}
        {counts.pending > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {counts.pending} Pending
          </span>
        )}
        {counts.rejected > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <X className="w-3 h-3 mr-1" />
            {counts.rejected} Rejected
          </span>
        )}
      </div>
    );
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
                    ? `${
                        apiTenants.find((t) => t.id === selectedArtist)
                          ?.businessName || "Artist"
                      } Inventory`
                    : "Inventory Management"}
                </h1>
                <p className="mt-1 text-sm text-gray-500 truncate">
                  {selectedArtist
                    ? `Manage products for this artist`
                    : `Total Artists: ${apiTenants.length}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
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
                <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Approved
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {artistStats.approvedProducts || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Active
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {artistStats.activeProducts || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Pending
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {artistStats.pendingProducts || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
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
                <X className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Rejected/Out of Stock
                  </dt>
                  <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                    {(artistStats.rejectedProducts || 0) +
                      (artistStats.outOfStockItems || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav
              className="-mb-px flex space-x-8 px-4 sm:px-6"
              aria-label="Tabs"
            >
              <button
                onClick={() => setActiveTab("products")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "products"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Products
              </button>
              <button
                onClick={() => setActiveTab("tenants")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "tenants"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Artists
              </button>
              <button
                onClick={() => setActiveTab("approvals")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "approvals"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Approvals
              </button>
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === "products" && (
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

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <select
                          aria-label="Filter by category"
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Categories</option>
                          {mockCategories.map((category) => (
                            <option key={category.id} value={category.name}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tenant Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tenant
                        </label>
                        <select
                          aria-label="Filter by tenant"
                          value={selectedTenantId}
                          onChange={(e) => setSelectedTenantId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Tenants</option>
                          {apiTenants.map((tenant) => (
                            <option key={tenant.id} value={tenant.id}>
                              {tenant.businessName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Status
                        </label>
                        <select
                          aria-label="Filter by status"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">All Status</option>
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                          <option value="active">Active</option>
                        </select>
                      </div>

                      {/* Sort Options */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sort By
                        </label>
                        <select
                          aria-label="Sort products"
                          value={`${sortBy}-${sortOrder}`}
                          onChange={(e) => {
                            const [field, order] = e.target.value.split("-");
                            setSortBy(field);
                            setSortOrder(order as "asc" | "desc");
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="name-asc">Name (A-Z)</option>
                          <option value="name-desc">Name (Z-A)</option>
                          <option value="price-asc">Price (Low to High)</option>
                          <option value="price-desc">
                            Price (High to Low)
                          </option>
                          <option value="stock-asc">Stock (Low to High)</option>
                          <option value="stock-desc">
                            Stock (High to Low)
                          </option>
                          <option value="created-desc">Newest First</option>
                          <option value="created-asc">Oldest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory("all");
                          setSelectedTenantId("all");
                          setFilterStatus("all");
                          setSortBy("name");
                          setSortOrder("asc");
                          setSearchQuery("");
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Products Grid */}
                <div className="overflow-y-auto max-h-[calc(100vh-525px)]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {loading ? (
                      Array.from({ length: 8 }).map((_, index) => (
                        <div
                          key={index}
                          className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse"
                        >
                          <div className="h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded mb-4"></div>
                          <div className="h-6 bg-gray-200 rounded"></div>
                        </div>
                      ))
                    ) : allProducts.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <Package className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                          No products found
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {searchQuery
                            ? "Try adjusting your search terms."
                            : "Get started by adding your first product."}
                        </p>
                      </div>
                    ) : (
                      allProducts.map((product) => {
                        // Find the corresponding API product to get variant information
                        const apiProduct = apiProducts.find(
                          (p) => p.id === product.id
                        );
                        const variants = apiProduct?.variants || [];

                        const handleCardClick = () => {
                          setSelectedProduct(apiProduct || null);
                          setShowProductDetails(true);
                        };

                        return (
                          <div
                            key={product.id}
                            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                            onClick={handleCardClick}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-sm font-medium text-gray-900 truncate">
                                {product.name}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-500 mb-2 truncate">
                              {product.tenantName}
                            </p>

                            {/* Variants Display */}
                            {variants.length > 0 ? (
                              <div className="mb-3">
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {variants
                                    .slice(0, 2)
                                    .map((variant, index) => (
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
                                        <span className="text-green-600 font-medium">
                                          ${variant.price?.toFixed(2) || "0.00"}
                                        </span>
                                        <span className="text-gray-500 ml-1">
                                          (Stock: {variant.stock || 0})
                                        </span>
                                      </div>
                                    ))}
                                  {variants.length > 2 && (
                                    <span className="text-xs text-gray-500">
                                      +{variants.length - 2} more
                                    </span>
                                  )}
                                </div>

                                {/* Total Stock and Value */}
                                <div className="border-t pt-2 mt-2">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-600">
                                      Total Stock:{" "}
                                      <span className="font-medium">
                                        {product.stock}
                                      </span>
                                    </span>
                                    <span className="text-green-600 font-medium">
                                      Total Value: $
                                      {variants
                                        .reduce(
                                          (sum, v) =>
                                            sum +
                                            (v.price || 0) * (v.stock || 0),
                                          0
                                        )
                                        .toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Variant Status Badges */}
                                {renderVariantStatusBadges(variants)}
                              </div>
                            ) : (
                              /* Base Product Display */
                              <div className="mb-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-lg font-semibold text-green-600">
                                    ${product.price?.toFixed(2) || "0.00"}
                                  </span>
                                  <span
                                    className={`text-sm ${
                                      product.stock <= product.lowStockThreshold
                                        ? "text-red-600"
                                        : "text-gray-600"
                                    }`}
                                  >
                                    Stock: {product.stock}
                                  </span>
                                </div>
                                <div className="text-xs text-green-600 font-medium mt-1">
                                  Total Value: $
                                  {(
                                    (product.price || 0) * (product.stock || 0)
                                  ).toFixed(2)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "tenants" && (
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
                        <option value="Inactive">Expired</option>
                        <option value="Upcoming">Upcoming</option>
                        <option value="Available">Available</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Tenants Table */}
                <div className="overflow-x-auto max-h-[calc(100vh-525px)] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Artist
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Products
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Variants
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
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
                          </tr>
                        ))
                      ) : filteredTenants.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-3 sm:px-6 py-12 text-center"
                          >
                            <Users className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                              No tenants found
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              No tenants match your current search or filter
                              criteria.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredTenants.map((tenant) => {
                          const tenantProducts = apiProducts.filter(
                            (p) => p.tenantId === tenant.id
                          );
                          const productCount = tenantProducts.length;

                          // Calculate total variants
                          const totalVariants = tenantProducts.reduce(
                            (sum, p) => {
                              return sum + (p.variants?.length || 0);
                            },
                            0
                          );

                          // Calculate total stock from variants
                          const totalStock = tenantProducts.reduce((sum, p) => {
                            if (p.variants && p.variants.length > 0) {
                              return (
                                sum +
                                p.variants.reduce(
                                  (variantSum, v) =>
                                    variantSum + (v.stock || 0),
                                  0
                                )
                              );
                            }
                            return sum;
                          }, 0);

                          // Calculate total rental value from variants
                          const totalRentalValue = tenantProducts.reduce(
                            (sum, p) => {
                              if (p.variants && p.variants.length > 0) {
                                return (
                                  sum +
                                  p.variants.reduce(
                                    (variantSum, v) =>
                                      variantSum + v.price * v.stock,
                                    0
                                  )
                                );
                              }
                              return sum;
                            },
                            0
                          );

                          return (
                            <tr
                              key={tenant.id}
                              className="hover:bg-gray-50 cursor-pointer"
                              onClick={() =>
                                router.push(`/inventory/products/${tenant.id}`)
                              }
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
                                      {tenant.user.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(
                                    calculateTenantStatus(tenant)
                                  )}`}
                                >
                                  {getStatusDisplayText(
                                    calculateTenantStatus(tenant)
                                  )}
                                </span>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {productCount}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {totalVariants}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {totalStock}
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

            {activeTab === "approvals" && (
              <div>
                {/* Search, Filter and Refresh */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <input
                          type="text"
                          placeholder="Search by product name, category, or tenant business name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 text-md pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <select
                        aria-label="Filter by approval status"
                        value={approvalStatusFilter}
                        onChange={(e) =>
                          setApprovalStatusFilter(e.target.value)
                        }
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                      <button
                        onClick={() => {
                          loadAdminProducts();
                          setSearchQuery("");
                          setApprovalStatusFilter("all");
                        }}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>
                  </div>
                </div>

                {/* Approval Table Area with Scroll */}
                <div className="overflow-y-auto max-h-[calc(100vh-525px)]">
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Image
                        </th> */}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
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
                          {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th> */}
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredAdminProducts.map((product) => {
                          const variants = product.variants || [];
                          return (
                            <tr key={product.id}>
                              {/* Image */}
                              {/* <td className="px-6 py-4 whitespace-nowrap">
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                {product.imageUrl ? (
                                  <Image
                                    src={product.imageUrl}
                                    alt={product.name}
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                            </td> */}
                              {/* Product */}
                              <td className="px-6 py-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {product.name}
                                  </div>
                                </div>
                              </td>
                              {/* Category */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {product.category || "Uncategorized"}
                                </span>
                              </td>

                              {/* Variants */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {variants && variants.length > 0 ? (
                                    <div>
                                      <div className="font-medium mb-2">
                                        {variants.length} variant(s)
                                      </div>
                                      <div className="space-y-1">
                                        {variants
                                          .slice(0, 2)
                                          .map((variant, idx) => (
                                            <div
                                              key={idx}
                                              className="flex items-center space-x-2"
                                            >
                                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                                {variant.color}
                                              </span>
                                              {/* <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                              {variant.size}
                                            </span> */}
                                              <span className="text-xs font-semibold text-green-600">
                                                $
                                                {(variant.price || 0).toFixed(
                                                  2
                                                )}
                                              </span>
                                              <span
                                                className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                                  variant.status === "APPROVED"
                                                    ? "bg-green-100 text-green-800"
                                                    : variant.status ===
                                                      "REJECTED"
                                                    ? "bg-red-100 text-red-800"
                                                    : "bg-yellow-100 text-yellow-800"
                                                }`}
                                              >
                                                {variant.status === "APPROVED"
                                                  ? "Approved"
                                                  : variant.status ===
                                                    "REJECTED"
                                                  ? "Rejected"
                                                  : "Pending"}
                                              </span>
                                              {/* <span className="text-xs text-gray-500">
                                              ({variant.stock || 0} units)
                                            </span> */}
                                            </div>
                                          ))}
                                        {variants.length > 2 && (
                                          <div className="text-blue-600 text-xs font-medium">
                                            +{variants.length - 2} more variants
                                          </div>
                                        )}
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Total Stock:{" "}
                                          </span>
                                          <span className="font-semibold text-gray-900">
                                            {variants.reduce(
                                              (sum, v) => sum + (v.stock || 0),
                                              0
                                            )}{" "}
                                            units
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          <span className="font-medium">
                                            Total Value:{" "}
                                          </span>
                                          <span className="font-semibold text-green-600">
                                            $
                                            {variants
                                              .reduce(
                                                (sum, v) =>
                                                  sum +
                                                  (v.price || 0) *
                                                    (v.stock || 0),
                                                0
                                              )
                                              .toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="font-medium mb-1">
                                        Base Product
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        <span className="font-semibold text-green-600">
                                          ${(product.price || 0).toFixed(2)}
                                        </span>
                                        <span className="text-gray-500 ml-2">
                                          ({product.stock || 0} units)
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        <span className="font-medium">
                                          Total Value:{" "}
                                        </span>
                                        <span className="font-semibold text-green-600">
                                          $
                                          {(
                                            (product.price || 0) *
                                            (product.stock || 0)
                                          ).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              {/* Tenant */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-medium text-blue-600">
                                      {product.tenant?.businessName
                                        ?.charAt(0)
                                        ?.toUpperCase() || "T"}
                                    </span>
                                  </div>
                                  <span className="text-sm text-gray-900">
                                    {product.tenant?.businessName || "Unknown"}
                                  </span>
                                </div>
                              </td>
                              {/* Status */}
                              {/* <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                    product.status === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : product.status === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {product.status === "APPROVED"
                                    ? "Approved"
                                    : product.status === "REJECTED"
                                    ? "Rejected"
                                    : "Pending"}
                                </span>
                                {variants.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {variants.filter(
                                      (v) => v.status === "PENDING"
                                    ).length > 0 && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                        {
                                          variants.filter(
                                            (v) => v.status === "PENDING"
                                          ).length
                                        }{" "}
                                        Pending
                                      </span>
                                    )}
                                    {variants.filter(
                                      (v) => v.status === "APPROVED"
                                    ).length > 0 && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                        {
                                          variants.filter(
                                            (v) => v.status === "APPROVED"
                                          ).length
                                        }{" "}
                                        Approved
                                      </span>
                                    )}
                                    {variants.filter(
                                      (v) => v.status === "REJECTED"
                                    ).length > 0 && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                        {
                                          variants.filter(
                                            (v) => v.status === "REJECTED"
                                          ).length
                                        }{" "}
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td> */}
                              {/* Actions */}
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex gap-2">
                                  {product.status === "PENDING" && (
                                    <>
                                      <button
                                        onClick={() =>
                                          handleApproval(product.id, true)
                                        }
                                        disabled={
                                          approvalLoading === product.id
                                        }
                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                      >
                                        {approvalLoading === product.id
                                          ? "Loading..."
                                          : "Approve"}
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleApproval(product.id, false)
                                        }
                                        disabled={
                                          approvalLoading === product.id
                                        }
                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                      >
                                        {approvalLoading === product.id
                                          ? "Loading..."
                                          : "Reject"}
                                      </button>
                                    </>
                                  )}
                                  {/* <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowBarcodeModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="View Barcode"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button> */}
                                  <button
                                    onClick={() =>
                                      router.push(
                                        `/admin/products/${product.id}`
                                      )
                                    }
                                    className="text-purple-600 hover:text-purple-900"
                                    title="Take Action - View Product Details"
                                  >
                                    Take Action
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {filteredAdminProducts.map((product) => {
                      const variants = product.variants || [];
                      return (
                        <div
                          key={product.id}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-medium text-gray-900 mb-1">
                                {product.name}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    product.status === "APPROVED"
                                      ? "bg-green-100 text-green-800"
                                      : product.status === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }`}
                                >
                                  {product.status === "APPROVED"
                                    ? "Approved"
                                    : product.status === "REJECTED"
                                    ? "Rejected"
                                    : "Pending"}
                                </span>
                                {product.category && (
                                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {product.category}
                                  </span>
                                )}
                              </div>
                            </div>
                            {product.imageUrl && (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden ml-3">
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>

                          <div className="space-y-3 mb-3">
                            {/* <p className="text-sm text-gray-500">
                              SKU: {product.sku}
                            </p> */}
                            <p className="text-sm text-gray-500">
                              Tenant: {product.tenant?.businessName}
                            </p>

                            {/* Enhanced Variants Display */}
                            {variants.length > 0 ? (
                              <div className="mt-3">
                                <div className="font-medium text-sm text-gray-900 mb-2">
                                  {variants.length} variant(s)
                                </div>
                                <div className="space-y-2">
                                  {variants.slice(0, 2).map((variant, idx) => (
                                    <div
                                      key={idx}
                                      className="flex flex-col gap-1 p-2 bg-gray-50 rounded"
                                    >
                                      <div className="flex items-center gap-2">
                                        {variant.color && (
                                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                                            {variant.color}
                                          </span>
                                        )}
                                        {variant.size && (
                                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                                            {variant.size}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-green-600">
                                          ${(variant.price || 0).toFixed(2)}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({variant.stock || 0} units)
                                        </span>
                                      </div>
                                      <div className="mt-1">
                                        <span
                                          className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                                            variant.status === "APPROVED"
                                              ? "bg-green-100 text-green-800"
                                              : variant.status === "REJECTED"
                                              ? "bg-red-100 text-red-800"
                                              : "bg-yellow-100 text-yellow-800"
                                          }`}
                                        >
                                          {variant.status === "APPROVED"
                                            ? "Approved"
                                            : variant.status === "REJECTED"
                                            ? "Rejected"
                                            : "Pending"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {variants.length > 2 && (
                                    <div className="text-blue-600 text-xs font-medium">
                                      +{variants.length - 2} more variants
                                    </div>
                                  )}
                                </div>
                                <div className="mt-3 pt-2 border-t border-gray-200">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-gray-600">
                                      <span className="font-medium">
                                        Total Stock:{" "}
                                      </span>
                                      <span className="font-semibold text-gray-900">
                                        {variants.reduce(
                                          (sum, v) => sum + (v.stock || 0),
                                          0
                                        )}{" "}
                                        units
                                      </span>
                                    </div>
                                    <div className="text-gray-600">
                                      <span className="font-medium">
                                        Total Value:{" "}
                                      </span>
                                      <span className="font-semibold text-green-600">
                                        $
                                        {variants
                                          .reduce(
                                            (sum, v) =>
                                              sum +
                                              (v.price || 0) * (v.stock || 0),
                                            0
                                          )
                                          .toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Variant Status Badges */}
                                <div className="mt-2">
                                  <p className="text-xs text-gray-500 mb-1">
                                    Status:
                                  </p>
                                  {renderVariantStatusBadges(variants)}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-3">
                                <div className="font-medium text-sm text-gray-900 mb-1">
                                  Base Product
                                </div>
                                <div className="p-2 bg-gray-50 rounded">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-green-600">
                                      ${(product.price || 0).toFixed(2)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      ({product.stock || 0} units)
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    <span className="font-medium">
                                      Total Value:{" "}
                                    </span>
                                    <span className="font-semibold text-green-600">
                                      $
                                      {(
                                        (product.price || 0) *
                                        (product.stock || 0)
                                      ).toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            {product.status === "PENDING" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApproval(product.id, true)
                                  }
                                  disabled={approvalLoading === product.id}
                                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  <Check className="w-4 h-4" />
                                  {approvalLoading === product.id
                                    ? "Loading..."
                                    : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApproval(product.id, false)
                                  }
                                  disabled={approvalLoading === product.id}
                                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md text-sm hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                  <X className="w-4 h-4" />
                                  {approvalLoading === product.id
                                    ? "Loading..."
                                    : "Reject"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setSelectedProductForModal(product);
                                    setShowVariantModal(true);
                                  }}
                                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  View Details
                                </button>
                                <button
                                  type="button"
                                  title="View Barcode"
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowBarcodeModal(true);
                                  }}
                                  className="bg-gray-600 text-white px-3 py-2 rounded-md text-sm hover:bg-gray-700 flex items-center justify-center"
                                >
                                  <QrCode className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Details Modal */}
      {showProductDetails && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-6 flex-1">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {productImageLoading[selectedProduct.id] ? (
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : productImages[selectedProduct.id] &&
                      productImages[selectedProduct.id] !== "No image" ? (
                      <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={productImages[selectedProduct.id]}
                          alt={selectedProduct.name}
                          width={128}
                          height={128}
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            console.error(
                              "Error loading product image:",
                              selectedProduct.id
                            );
                            e.currentTarget.style.display = "none";
                            const nextElement =
                              e.currentTarget.nextElementSibling;
                            if (nextElement) {
                              if (nextElement instanceof HTMLElement) {
                                nextElement.style.display = "flex";
                              }
                            }
                          }}
                        />
                        <div className="absolute inset-0 bg-gray-100 rounded-lg hidden items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                          <span className="ml-2 text-sm text-gray-500">
                            No image
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">
                          No image
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedProduct.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      {/* <span className="text-sm text-gray-500">
                        SKU: {selectedProduct.sku}
                      </span> */}
                      <span className="text-sm text-gray-500">
                        Category: {selectedProduct.category}
                      </span>
                      <span className="text-sm text-gray-500">
                        Tenant: {selectedProduct.tenant?.businessName}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowProductDetails(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold flex-shrink-0"
                >
                  ×
                </button>
              </div>

              {/* Product Status */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Product Status
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Created:{" "}
                    {new Date(selectedProduct.createdAt).toLocaleDateString()}
                  </span>
                  <span className="text-sm text-gray-500">
                    Updated:{" "}
                    {new Date(selectedProduct.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Variants */}
              {selectedProduct.variants &&
              selectedProduct.variants.length > 0 ? (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Product Variants ({selectedProduct.variants.length})
                    </h3>
                  </div>

                  {/* Variant Search Bar */}
                  <div className="mb-4">
                    <input
                      type="text"
                      value={variantSearchTerm}
                      onChange={(e) => setVariantSearchTerm(e.target.value)}
                      placeholder="Search variants by color, size or barcode..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedProduct.variants
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
                        <div
                          key={variant.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
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
                                  alt={`${variant.color || ""} ${
                                    variant.size || ""
                                  } variant`}
                                  width={400}
                                  height={400}
                                  className="object-contain w-full h-auto max-h-96"
                                  onError={() => {
                                    setVariantImages((prev) => ({
                                      ...prev,
                                      [variant.id]: "",
                                    }));
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Package className="h-8 w-8 text-gray-400" />
                                <span className="ml-2 text-sm text-gray-500">
                                  No image
                                </span>
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
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                variant.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : variant.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {variant.status}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Price:
                              </span>
                              <span className="text-sm font-medium text-green-600">
                                ${variant.price?.toFixed(2) || "0.00"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                Stock:
                              </span>
                              <span
                                className={`text-sm font-medium ${
                                  (variant.stock || 0) <= 5
                                    ? "text-red-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {variant.stock || 0}
                              </span>
                            </div>
                            {/* <div className="flex justify-between">
                              <span className="text-sm text-gray-600">
                                SKU:
                              </span>
                              <span className="text-sm text-gray-900">
                                {variant.sku}
                              </span>
                            </div> */}
                            {variant.barcode && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                  Barcode:
                                </span>
                                <span className="text-sm text-gray-900">
                                  {variant.barcode}
                                </span>
                              </div>
                            )}
                            <div className="border-t pt-2 mt-2">
                              <div className="flex justify-between mb-2">
                                <span className="text-sm text-gray-600">
                                  Total Value:
                                </span>
                                <span className="text-sm font-medium text-green-600">
                                  $
                                  {(
                                    (variant.price || 0) * (variant.stock || 0)
                                  ).toFixed(2)}
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
                  {/* <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Summary
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">
                          Total Variants:
                        </span>
                        <div className="text-lg font-semibold text-gray-900">
                          {(() => {
                            const count = selectedProductForModal?.variants?.length ?? 0;
                            console.log('Variant count:', count, 'Variants:', selectedProductForModal?.variants);
                            return count;
                          })()}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Total Stock:
                        </span>
                        <div className="text-lg font-semibold text-gray-900">
                          {(() => {
                            const totalStock = selectedProductForModal?.variants?.reduce(
                              (sum, v) => {
                                const stock = Number(v.stock) || 0;
                                console.log(`Variant ${v.id} stock:`, v.stock, 'converted:', stock);
                                return sum + stock;
                              },
                              0
                            ) ?? 0;
                            console.log('Total stock:', totalStock);
                            return totalStock;
                          })()}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Total Value:
                        </span>
                        <div className="text-lg font-semibold text-green-600">
                          $
                          {(() => {
                            const totalValue = (selectedProductForModal?.variants
                              ?.reduce(
                                (sum, v) => {
                                  const price = Number(v.price) || 0;
                                  const stock = Number(v.stock) || 0;
                                  const value = price * stock;
                                  console.log(`Variant ${v.id} - price: ${v.price} (${price}), stock: ${v.stock} (${stock}), value: ${value}`);
                                  return sum + value;
                                },
                                0
                              ) ?? 0
                            ).toFixed(2);
                            console.log('Total value:', totalValue);
                            return totalValue;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div> */}
                </div>
              ) : (
                /* Base Product Details */
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Product Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Price:</span>
                        <div className="text-lg font-semibold text-green-600">
                          $
                          {selectedProductForModal?.price?.toFixed(2) || "0.00"}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Stock:</span>
                        <div
                          className={`text-lg font-semibold ${
                            (selectedProductForModal?.stock || 0) <= 5
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {selectedProductForModal?.stock || 0}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">
                          Total Value:
                        </span>
                        <div className="text-lg font-semibold text-green-600">
                          $
                          {(
                            (selectedProductForModal?.price || 0) *
                            (selectedProductForModal?.stock || 0)
                          ).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              {/* <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowVariantModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div> */}
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
                  Barcode for {selectedVariantForBarcode.color}{" "}
                  {selectedVariantForBarcode.size}
                </h2>
                <button
                  title="Close modal"
                  onClick={closeBarcodeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Barcode Search Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Barcode Lookup
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeSearchTerm}
                    onChange={(e) => setBarcodeSearchTerm(e.target.value)}
                    placeholder="Enter barcode to search..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) =>
                      e.key === "Enter" && searchBarcode(barcodeSearchTerm)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => searchBarcode(barcodeSearchTerm)}
                    disabled={barcodeSearchLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {barcodeSearchLoading ? "Searching..." : "Search"}
                  </button>
                </div>

                {/* Search Results */}
                {barcodeSearchResult && (
                  <div className="mt-4 p-3 bg-white rounded border">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Search Result:
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Product:</span>{" "}
                        {barcodeSearchResult.productName}
                      </div>
                      <div>
                        <span className="font-medium">Category:</span>{" "}
                        {barcodeSearchResult.category}
                      </div>
                      <div>
                        <span className="font-medium">Color:</span>{" "}
                        {barcodeSearchResult.color}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span>{" "}
                        {barcodeSearchResult.size}
                      </div>
                      <div>
                        <span className="font-medium">Price:</span> $
                        {barcodeSearchResult.price}
                      </div>
                      <div>
                        <span className="font-medium">Stock:</span>{" "}
                        {barcodeSearchResult.stock}
                      </div>
                      <div>
                        <span className="font-medium">Barcode:</span>{" "}
                        {barcodeSearchResult.barcode}
                      </div>
                      <div>
                        <span className="font-medium">Tenant:</span>{" "}
                        {barcodeSearchResult.tenant?.businessName}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Variant Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Variant Details
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">SKU:</span>
                      <div className="font-medium">
                        {selectedVariantForBarcode.sku}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Barcode:</span>
                      <div className="font-medium">
                        {selectedVariantForBarcode.barcode}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <div className="font-medium text-green-600">
                        ${selectedVariantForBarcode.price?.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Stock:</span>
                      <div className="font-medium">
                        {selectedVariantForBarcode.stock}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Color:</span>
                      <div className="font-medium">
                        {selectedVariantForBarcode.color}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Size:</span>
                      <div className="font-medium">
                        {selectedVariantForBarcode.size}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Barcode Image */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Barcode Image
                </h3>
                <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {barcodeLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-gray-600">
                        Loading barcode...
                      </span>
                    </div>
                  ) : barcodeImageUrl ? (
                    <div>
                      <img
                        src={barcodeImageUrl}
                        alt="Barcode"
                        className="mx-auto max-w-full h-auto border rounded"
                        style={{ maxHeight: "200px" }}
                      />
                      <p className="mt-2 text-sm text-gray-600">
                        Barcode for {selectedVariantForBarcode.barcode}
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="mt-2">Failed to load barcode image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="flex justify-end">
                <button
                  type="button"
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
