"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import TenantForm from "@/components/TenantForm";
import { Tenant, TenantFormData, RentPayment } from "@/types/tenant";
import { getRolePermissions } from "@/data/mockAuth";
import { adminTenantService } from "@/services/adminTenantService";



interface ApiTenant {
  id: string;
  userId: string;
  businessName: string;
  address: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  rentals: Array<{
    id: string;
    tenantId: string;
    cubeId: string;
    startDate: string;
    endDate: string;
    status: string;
    dailyRent: number;
    lastPayment: string | null;
    createdAt: string;
    updatedAt: string;
    allocatedById: string;
    cube?: {
      id: string;
      code: string;
      size: string;
      pricePerDay: number;
      status: string;
      createdAt: string;
      updatedAt: string;
    };
  }>;
}

export default function TenantsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch tenants from API
  const fetchTenants = async () => {
    try {
      console.log('=== TENANT FETCH DEBUG ===');
      console.log('Is authenticated:', isAuthenticated);
      console.log('Current user:', user);
      
      console.log('Calling adminTenantService.getTenants()...');
      const apiTenants = await adminTenantService.getTenants();
      console.log('Raw API response:', apiTenants);
      console.log('API response type:', typeof apiTenants);
      console.log('API response length:', Array.isArray(apiTenants) ? apiTenants.length : 'Not an array');
      
      if (Array.isArray(apiTenants) && apiTenants.length > 0) {
        console.log('First tenant sample:', apiTenants[0]);
      }
      
      // Convert API tenants to the format expected by the UI
      const convertedTenants: Tenant[] = apiTenants.map((apiTenant) => {
        // Handle multiple rentals - get the most recent active one or the first one
        const activeRental = apiTenant.rentals.find(rental => rental.status === "ACTIVE") || apiTenant.rentals[0];
        
        let status: "Upcoming" | "Active" | "Inactive" | "Available" = "Available";
        
        if (activeRental) {
          const now = new Date();
          const startDate = new Date(activeRental.startDate);
          const endDate = new Date(activeRental.endDate);
          
          if (activeRental.status === "ACTIVE" && now >= startDate && now <= endDate) {
            status = "Active"; // Currently renting and within rental period
          } else if (now < startDate) {
            status = "Upcoming"; // Has rental but start date is in future
          } else {
            status = "Inactive"; // Rental period has ended
          }
        } else {
          // No rentals - tenant is approved but hasn't rented any cube
          status = "Available";
        }

        const convertedTenant = {
          id: apiTenant.id,
          name: apiTenant.user.name,
          email: apiTenant.user.email,
          phone: apiTenant.user.phone,
          businessName: apiTenant.businessName,
          cubeId: activeRental?.cube?.code || "-",
          leaseStartDate: activeRental?.startDate || "",
          leaseEndDate: activeRental?.endDate || "",
          dailyRent: activeRental?.dailyRent || 0,
          securityDeposit: 0, // Not in API
          status,
          rentPayments: [], // Not in current API structure
          address: apiTenant.address,
          notes: apiTenant.notes || "",
        };
        
        console.log("Converted tenant:", convertedTenant);
        return convertedTenant;
      });
      
      console.log("All converted tenants:", convertedTenants);
      setTenants(convertedTenants);
      console.log('Tenants state updated');
    } catch (error: any) {
      console.error('=== TENANT FETCH ERROR ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Full error object:', error);
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth");
      return;
    }

    if (user && !getRolePermissions(user.role).includes("tenants")) {
      router.push("/");
      return;
    }

    if (isAuthenticated && user) {
      fetchTenants();
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (
    !isAuthenticated ||
    !user ||
    !getRolePermissions(user.role).includes("tenants")
  ) {
    return null; // Will redirect
  }

  const handleAddTenant = () => {
    setEditingTenant(null);
    setIsFormOpen(true);
  };

  const handleViewTenant = (tenantId: string) => {
    router.push(`/admin/tenants/${tenantId}`);
  };

  const handleSubmitTenant = async (tenant: Tenant) => {
    if (editingTenant) {
      // Update existing tenant - would need API endpoint for updates
      setTenants((prev) => prev.map((t) => (t.id === tenant.id ? tenant : t)));
    } else {
      // Add new tenant - TenantForm already handles the API call
      // Just add the tenant to the local state and refresh the list
      setTenants((prev) => [...prev, tenant]);
      setIsFormOpen(false);

      // Optionally refresh the tenant list to get the latest data from server
      setTimeout(() => {
        fetchTenants();
      }, 1000);
    }
  };

  const handleUpdateLease = (
    tenantId: string,
    startDate: string,
    endDate: string
  ) => {
    // Calculate status based on dates
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    let status: "Upcoming" | "Active" | "Inactive" = "Inactive";

    if (now < start) {
      status = "Upcoming";
    } else if (now >= start && now <= end) {
      status = "Active";
    } else {
      status = "Inactive";
    }

    setTenants((prev: Tenant[]) =>
      prev.map((tenant) => {
        if (tenant.id === tenantId) {
          return {
            ...tenant as Tenant,
            leaseStartDate: startDate,
            leaseEndDate: endDate,
            status,
          };
        }
return tenant as Tenant;
      })
    );
  };

  const handleAddPayment = (
    tenantId: string,
    payment: Omit<RentPayment, "id" | "tenantId">
  ) => {
    const newPayment: RentPayment = {
      ...payment,
      id: `payment-${Date.now()}`,
      tenantId,
    };

    setTenants((prev) =>
      prev.map((tenant) => {
        if (tenant.id === tenantId) {
          return {
            ...tenant,
            rentPayments: [...tenant.rentPayments, newPayment],
          };
        }
        return tenant;
      })
    );
  };

  const downloadPaymentHistory = (tenantId?: string) => {
    let paymentsToExport: (RentPayment & { tenantName: string })[] = [];

    if (tenantId) {
      // Download for specific tenant
      const tenant = tenants.find((t) => t.id === tenantId);
      if (tenant) {
        paymentsToExport = tenant.rentPayments.map((payment) => ({
          ...payment,
          tenantName: tenant.name,
        }));
      }
    } else {
      // Download for all tenants
      paymentsToExport = tenants.flatMap((tenant) =>
        tenant.rentPayments.map((payment) => ({
          ...payment,
          tenantName: tenant.name,
        }))
      );
    }

    // Create CSV content
    const headers = [
      "Date",
      "Tenant Name",
      "Amount",
      "Payment Method",
      "Payment ID",
    ];
    const csvContent = [
      headers.join(","),
      ...paymentsToExport.map((payment) =>
        [
          new Date(payment.date).toLocaleDateString(),
          payment.tenantName,
          `$${payment.amount}`,
          payment.method,
          payment.id,
        ].join(",")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `payment-history-${tenantId || "all"}-${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-4 px-4 sm:py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Tenant & Rental Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Manage tenants, leases, and rent collection for Cornven cube spaces
          </p>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-2 sm:space-y-0">
          <h2 className="text-2xl font-bold text-gray-900">
            Tenant Management
          </h2>
          <button
            onClick={handleAddTenant}
            className="btn-primary flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add New Tenant</span>
          </button>
        </div>

        {/* Tenant Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {tenants.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="w-16 h-16 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tenants found
              </h3>
              <p className="text-gray-500 mb-4">
                Get started by adding your first tenant.
              </p>
              <button
                onClick={handleAddTenant}
                className="btn-primary"
              >
                Add First Tenant
              </button>
            </div>
          ) : (
            tenants.map((tenant) => (
              <div
                key={tenant.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewTenant(tenant.id)}
              >
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.status === "Active"
                        ? "bg-green-100 text-green-800"
                        : tenant.status === "Upcoming"
                        ? "bg-blue-100 text-blue-800"
                        : tenant.status === "Inactive"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {tenant.status}
                  </span>
                  <span className="text-sm font-medium text-gray-500">
                    Cube {tenant.cubeId}
                  </span>
                </div>

                {/* Business Name */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {tenant.businessName}
                </h3>

                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 mr-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    {tenant.name}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 mr-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    {tenant.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg
                      className="w-4 h-4 mr-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    {tenant.phone}
                  </div>
                </div>

                {/* Rental Info */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Daily Rent
                    </span>
                    <span className="text-lg font-bold text-primary-600">
                      ${tenant.dailyRent}
                    </span>
                  </div>
                  {tenant.leaseStartDate && tenant.leaseEndDate && (
                    <div className="text-xs text-gray-500">
                      {new Date(tenant.leaseStartDate).toLocaleDateString()} -{" "}
                      {new Date(tenant.leaseEndDate).toLocaleDateString()}
                    </div>
                  )}
                  {tenant.notes && (
                    <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {tenant.notes}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Statistics Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-primary-600">
              {tenants.length}
            </div>
            <div className="text-sm text-gray-600">Total Tenants</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {tenants.filter((t) => t.status === "Active").length}
            </div>
            <div className="text-sm text-gray-600">Active Leases</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {tenants.filter((t) => t.status === "Upcoming").length}
            </div>
            <div className="text-sm text-gray-600">Upcoming Leases</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="text-2xl font-bold text-red-600">
              {tenants.filter((t) => t.status === "Inactive").length}
            </div>
            <div className="text-sm text-gray-600">Expired Leases</div>
          </div>
        </div>
      </div>

      {/* Tenant Form Modal */}
      <TenantForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitTenant}
        editingTenant={editingTenant}
      />
    </div>
  );
}
