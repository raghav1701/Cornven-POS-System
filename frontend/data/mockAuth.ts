import { User } from '@/types/auth';

// Mock users for testing
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'admin@cornven.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'inventory@cornven.com',
    name: 'Inventory Manager',
    role: 'inventory',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'pos@cornven.com',
    name: 'POS Operator',
    role: 'pos',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tenant-1',
    email: 'sarah@artcorner.com',
    name: 'Sarah Johnson',
    role: 'tenant',
    tenantId: 'tenant-1',
    artistId: 'ART001',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tenant-2',
    email: 'luna@jewelry.com',
    name: 'Luna Martinez',
    role: 'tenant',
    tenantId: 'tenant-2',
    artistId: 'ART002',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tenant-3',
    email: 'otaku@crafts.com',
    name: 'Alex Chen',
    role: 'tenant',
    tenantId: 'tenant-3',
    artistId: 'ART003',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tenant-4',
    email: 'pixel@dreams.com',
    name: 'Maya Patel',
    role: 'tenant',
    tenantId: 'tenant-4',
    artistId: 'ART004',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tenant-5',
    email: 'paper@ink.com',
    name: 'David Kim',
    role: 'tenant',
    tenantId: 'tenant-5',
    artistId: 'ART005',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// Mock authentication functions
export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // For demo purposes, accept any password for existing users
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (user && password.length >= 6) {
    return user;
  }
  
  return null;
};

export const createUser = async (userData: {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'inventory' | 'pos';
}): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if user already exists
  const existingUser = mockUsers.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
  if (existingUser) {
    throw new Error('User with this email already exists');
  }
  
  const newUser: User = {
    id: `user-${Date.now()}`,
    email: userData.email,
    name: userData.name,
    role: userData.role,
    createdAt: new Date().toISOString()
  };
  
  mockUsers.push(newUser);
  return newUser;
};

export const getRoleDisplayName = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'Administrator';
    case 'inventory':
      return 'Inventory Manager';
    case 'pos':
      return 'POS Operator';
    case 'tenant':
      return 'Tenant/Artist';
    default:
      return 'Unknown Role';
  }
};

export const getRolePermissions = (role: string): string[] => {
  switch (role) {
    case 'admin':
      return ['tenants', 'inventory', 'pos', 'reports', 'admin-sales', 'admin-products'];
    case 'inventory':
      return ['inventory', 'pos'];
    case 'pos':
      return ['pos', 'pos-sales'];
    case 'tenant':
      return ['tenant-dashboard', 'tenant-products', 'tenant-sales', 'tenant-payments'];
    default:
      return [];
  }
};