import { Tenant, RentPayment } from '@/types/tenant';

export const mockRentPayments: RentPayment[] = [
  
];

export const mockTenants: Tenant[] = [
  
];

export const availableCubes = ['C1', 'C2', 'C3', 'C4', 'C5'];

// Utility function to calculate lease status based on dates
export const calculateLeaseStatus = (startDate: string, endDate: string): 'Upcoming' | 'Active' | 'Expired' => {
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (today < start) {
    return 'Upcoming';
  } else if (today >= start && today <= end) {
    return 'Active';
  } else {
    return 'Expired';
  }
};