// src/types.ts
export type PaymentMethod = "CASH" | "CARD" | "BANK_TRANSFER" | "UPI" | "OTHER";

export type BillingSummary = {
  accruedToDate: number;
  dueToDate: number;
  totalPaid: number;
  balanceDue: number;
  unbilledAccrued: number;
  fortnightsElapsed: number;
  lastDueDate: string; // ISO
  nextDueDate: string; // ISO
  overdue: boolean;
  expectedDue: number; // alias for dueToDate
};

export type Payment = {
  id: string;
  rentalId: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string; // ISO
  note?: string;
  createdAt: string; // ISO
  receivedById?: string | null;
  receivedBy?: { id: string; name: string } | null;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TENANT" | "STAFF" | "ACCOUNTANT";
};

export type Tenant = {
  id: string;
  userId: string;
  businessName: string;
};

export type Cube = {
  id: string;
  code: string;
  pricePerDay: number;
};

export type Rental = {
  id: string;
  tenantId: string;
  cubeId: string;
  startDate: string; // ISO
  endDate: string; // ISO
  dailyRent: number;
  // denormalized bits for UI (match your admin overdue payload)
  tenant: {
    id: string;
    user: { id: string; name: string; email: string };
  };
  cube: { id: string; code: string };
};

export type OverdueItem = {
  rental: Rental;
  summary: BillingSummary;
};
