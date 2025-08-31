// Unified tenant status calculation utility
// This ensures consistent status calculation across all pages

export type TenantStatus = "Active" | "Inactive" | "Upcoming" | "Available";

interface Rental {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  [key: string]: any;
}

interface TenantWithRentals {
  rentals?: Rental[];
  [key: string]: any;
}

/**
 * Calculate tenant status based on rental data and current date
 * @param tenant - Tenant object with rentals array
 * @returns TenantStatus - Active, Inactive, Upcoming, or Available
 */
export const calculateTenantStatus = (tenant: TenantWithRentals): TenantStatus => {
  // If no rentals exist, tenant is available for new rentals
  if (!tenant.rentals || tenant.rentals.length === 0) {
    return "Available";
  }

  // Get the most recent active rental or the first rental
  const activeRental = tenant.rentals.find(rental => 
    rental.status === "ACTIVE" || rental.status === "Active"
  ) || tenant.rentals[0];

  if (!activeRental) {
    return "Available";
  }

  const now = new Date();
  const startDate = new Date(activeRental.startDate);
  const endDate = new Date(activeRental.endDate);

  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    console.warn('Invalid rental dates found:', activeRental);
    return "Available";
  }

  // Determine status based on current date and rental period
  if (now < startDate) {
    // Rental hasn't started yet
    return "Upcoming";
  } else if (now >= startDate && now <= endDate) {
    // Currently within rental period
    return "Active";
  } else {
    // Rental period has ended
    return "Inactive";
  }
};

/**
 * Calculate rental status for backend API (used for database updates)
 * @param startDate - Rental start date
 * @param endDate - Rental end date
 * @returns Database rental status
 */
export const calculateRentalStatus = (startDate: string | Date, endDate: string | Date): "UPCOMING" | "ACTIVE" | "EXPIRED" => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return "UPCOMING";
  } else if (now >= start && now <= end) {
    return "ACTIVE";
  } else {
    return "EXPIRED";
  }
};

/**
 * Get status color class for UI display
 * @param status - Tenant status
 * @returns Tailwind CSS color classes
 */
export const getStatusColorClass = (status: TenantStatus): string => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Inactive":
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
    case "Inactive":
      return "Inactive";
    case "Upcoming":
      return "Upcoming";
    case "Available":
      return "Available";
    default:
      return "Unknown";
  }
};