// Unified tenant status calculation utility
// This ensures consistent status calculation across all pages
// Uses API rental statuses directly, only calculates AVAILABLE on frontend

export type TenantStatus = "Active" | "Expired" | "Upcoming" | "Available";

interface Rental {
  id: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "UPCOMING" | "EXPIRED";
  [key: string]: any;
}

export interface TenantWithRentals {
  rentals?: Rental[];
  [key: string]: any;
}

/**
 * Calculate tenant status based on API rental statuses
 * Uses backend rental status directly, only frontend logic is for AVAILABLE
 * @param tenant - Tenant object with rentals array
 * @returns TenantStatus - Active, Expired, Upcoming, or Available
 */
export const calculateTenantStatus = (tenant: TenantWithRentals): TenantStatus => {
  // If no rentals exist, tenant is available for new rentals (frontend-only status)
  if (!tenant.rentals || tenant.rentals.length === 0) {
    return "Available";
  }

  // Find the most recent or active rental to determine tenant status
  // Priority: ACTIVE > UPCOMING > EXPIRED
  const activeRental = tenant.rentals.find(rental => rental.status === "ACTIVE");
  if (activeRental) {
    return "Active";
  }

  const upcomingRental = tenant.rentals.find(rental => rental.status === "UPCOMING");
  if (upcomingRental) {
    return "Upcoming";
  }

  // All rentals are expired
  return "Expired";
};

/**
 * Calculate rental status dynamically from dates (frontend-only)
 * @param startDate - Rental start date
 * @param endDate - Rental end date
 * @returns Database rental status format
 */
export const calculateRentalStatus = (startDate: string | Date, endDate: string | Date): "UPCOMING" | "ACTIVE" | "EXPIRED" => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn('Invalid dates provided to calculateRentalStatus:', { startDate, endDate });
    return "EXPIRED";
  }

  if (now < start) {
    return "UPCOMING";
  } else if (now >= start && now <= end) {
    return "ACTIVE";
  } else {
    return "EXPIRED";
  }
};

/**
 * Update rental objects with dynamically calculated status
 * @param rentals - Array of rental objects
 * @returns Array of rentals with updated status
 */
export const updateRentalStatuses = (rentals: Rental[]): Rental[] => {
  return rentals.map(rental => ({
    ...rental,
    status: calculateRentalStatus(rental.startDate, rental.endDate)
  }));
};

/**
 * Update tenant objects with dynamically calculated rental statuses
 * @param tenants - Array of tenant objects with rentals
 * @returns Array of tenants with updated rental statuses
 */
export function updateTenantRentalStatuses(tenants: TenantWithRentals[]): TenantWithRentals[];
export function updateTenantRentalStatuses(tenant: TenantWithRentals): TenantWithRentals;
export function updateTenantRentalStatuses(input: TenantWithRentals | TenantWithRentals[]): TenantWithRentals | TenantWithRentals[] {
  if (Array.isArray(input)) {
    return input.map(tenant => ({
      ...tenant,
      rentals: tenant.rentals ? updateRentalStatuses(tenant.rentals) : []
    }));
  } else {
    return {
      ...input,
      rentals: input.rentals ? updateRentalStatuses(input.rentals) : []
    };
  }
}

/**
 * Get status color class for UI display
 * @param status - Tenant status
 * @returns Tailwind CSS color classes
 */
export const getStatusColorClass = (status: TenantStatus): string => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Expired":
      return "bg-red-100 text-red-800";
    case "Upcoming":
      return "bg-blue-100 text-blue-800";
    case "Available":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

/**
 * Get status display text
 * @param status - Tenant status
 * @returns Human-readable status text
 */
export const getStatusDisplayText = (status: TenantStatus): string => {
  switch (status) {
    case "Active":
      return "Active";
    case "Expired":
      return "Expired";
    case "Upcoming":
      return "Upcoming";
    case "Available":
      return "Available";
    default:
      return "Unknown";
  }
};