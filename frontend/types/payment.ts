export interface Payment {
  id: string;
  rentalId: string;
  amount: number;
  method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHEQUE';
  paidAt: string;
  receivedById: string;
  note: string;
  createdAt: string;
  receivedBy: {
    id: string;
    name: string;
  };
}

export interface PaymentSummary {
  accruedToDate: number;
  dueToDate: number;
  totalPaid: number;
  balanceDue: number;
  unbilledAccrued: number;
  fortnightsElapsed: number;
  lastDueDate: string;
  nextDueDate: string;
  overdue: boolean;
  expectedDue: number;
}

export interface PaymentHistoryResponse {
  payments: Payment[];
  summary: PaymentSummary;
}

export interface PaymentMethod {
  value: string;
  label: string;
}

export interface PaymentRecord {
  id: string;
  rentalId: string;
  amount: number;
  method: string;
  paidAt: Date;
  receivedById: string;
  note?: string;
}

export interface RecordPaymentRequest {
  amount: number;
  method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHEQUE';
  paidAt: string;
  note?: string;
}

export interface RecordPaymentResponse {
  payment: {
    id: string;
    rentalId: string;
    amount: number;
    method: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHEQUE';
    paidAt: string;
    receivedById: string;
    note?: string;
    createdAt: string;
  };
  summary: PaymentSummary;
}