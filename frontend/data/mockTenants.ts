// Shared storage for tenants data
// In a real app, this would be from a shared database
export let storedTenants: any[] = [];
export let storedAllocations: any[] = [];

// Helper functions to manage tenant data
export const addTenant = (tenant: any) => {
  storedTenants.push(tenant);
};

export const getTenants = () => {
  return storedTenants;
};

export const addAllocation = (allocation: any) => {
  storedAllocations.push(allocation);
};

export const getAllocations = () => {
  return storedAllocations;
};