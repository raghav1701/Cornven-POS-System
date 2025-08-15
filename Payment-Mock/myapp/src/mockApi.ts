// src/mockApi.ts
import {
  BillingSummary,
  OverdueItem,
  Payment,
  PaymentMethod,
  Rental,
  User,
  Tenant,
  Cube,
} from "./types";
import { summarizeRentalFront } from "./utils/billing";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ---- Admin + 6 tenants
const admin: User = {
  id: "admin-1",
  name: "Admin Abe",
  email: "admin@example.com",
  role: "ADMIN",
};
const people: User[] = [
  {
    id: "u-1",
    name: "Alice Tenant",
    email: "alice@tenant.com",
    role: "TENANT",
  },
  { id: "u-2", name: "Ben Gallery", email: "ben@tenant.com", role: "TENANT" },
  {
    id: "u-3",
    name: "Cara Collective",
    email: "cara@tenant.com",
    role: "TENANT",
  },
  { id: "u-4", name: "Dan Studio", email: "dan@tenant.com", role: "TENANT" },
  { id: "u-5", name: "Eve Artist", email: "eve@tenant.com", role: "TENANT" },
  { id: "u-6", name: "Finn Crafts", email: "finn@tenant.com", role: "TENANT" },
];

const tenants: Tenant[] = people.map((u, i) => ({
  id: `t-${i + 1}`,
  userId: u.id,
  businessName: `${u.name.split(" ")[0]} Arts`,
}));

const cubes: Cube[] = [
  { id: "c-1", code: "A1", pricePerDay: 6.67 },
  { id: "c-2", code: "A2", pricePerDay: 8.5 },
  { id: "c-3", code: "B1", pricePerDay: 12.0 },
  { id: "c-4", code: "B2", pricePerDay: 5.25 },
  { id: "c-5", code: "C1", pricePerDay: 9.75 },
  { id: "c-6", code: "C2", pricePerDay: 7.4 },
];

// helper for ISO dates
const iso = (y: number, m: number, d: number) =>
  new Date(Date.UTC(y, m - 1, d)).toISOString();

// Different rental shapes to show variety (overdue, up to date, upcoming)
const rentals: Rental[] = [
  // Overdue: started 21 days ago, ends far ahead, daily rent 6.67
  {
    id: "r-1",
    tenantId: "t-1",
    cubeId: "c-1",
    startDate: iso(2025, 7, 25),
    endDate: iso(2025, 10, 31),
    dailyRent: cubes[0].pricePerDay,
    tenant: {
      id: "t-1",
      user: { id: "u-1", name: people[0].name, email: people[0].email },
    },
    cube: { id: "c-1", code: cubes[0].code },
  },
  // Partially paid overdue
  {
    id: "r-2",
    tenantId: "t-2",
    cubeId: "c-2",
    startDate: iso(2025, 7, 20),
    endDate: iso(2025, 9, 30),
    dailyRent: cubes[1].pricePerDay,
    tenant: {
      id: "t-2",
      user: { id: "u-2", name: people[1].name, email: people[1].email },
    },
    cube: { id: "c-2", code: cubes[1].code },
  },
  // Up-to-date (exactly paid first fortnight)
  {
    id: "r-3",
    tenantId: "t-3",
    cubeId: "c-3",
    startDate: iso(2025, 8, 1),
    endDate: iso(2025, 12, 31),
    dailyRent: cubes[2].pricePerDay,
    tenant: {
      id: "t-3",
      user: { id: "u-3", name: people[2].name, email: people[2].email },
    },
    cube: { id: "c-3", code: cubes[2].code },
  },
  // Upcoming (future start)
  {
    id: "r-4",
    tenantId: "t-4",
    cubeId: "c-4",
    startDate: iso(2025, 9, 1),
    endDate: iso(2025, 12, 31),
    dailyRent: cubes[3].pricePerDay,
    tenant: {
      id: "t-4",
      user: { id: "u-4", name: people[3].name, email: people[3].email },
    },
    cube: { id: "c-4", code: cubes[3].code },
  },
  // Long-running, multiple fortnights elapsed
  {
    id: "r-5",
    tenantId: "t-5",
    cubeId: "c-5",
    startDate: iso(2025, 7, 1),
    endDate: iso(2025, 9, 30),
    dailyRent: cubes[4].pricePerDay,
    tenant: {
      id: "t-5",
      user: { id: "u-5", name: people[4].name, email: people[4].email },
    },
    cube: { id: "c-5", code: cubes[4].code },
  },
  // Cheap, nearly up to date
  {
    id: "r-6",
    tenantId: "t-6",
    cubeId: "c-6",
    startDate: iso(2025, 7, 28),
    endDate: iso(2025, 11, 30),
    dailyRent: cubes[5].pricePerDay,
    tenant: {
      id: "t-6",
      user: { id: "u-6", name: people[5].name, email: people[5].email },
    },
    cube: { id: "c-6", code: cubes[5].code },
  },
];

// Seed a few payments (partial/complete)
let payments: Payment[] = [
  // r-2 partial payment
  {
    id: uid(),
    rentalId: "r-2",
    amount: 75,
    method: "BANK_TRANSFER",
    paidAt: iso(2025, 8, 5),
    note: "Part pay",
    createdAt: iso(2025, 8, 5),
    receivedById: admin.id,
    receivedBy: { id: admin.id, name: admin.name },
  },
  // r-3 exactly first fortnight (if already elapsed)
  {
    id: uid(),
    rentalId: "r-3",
    amount: 14 * rentals[2].dailyRent,
    method: "CARD",
    paidAt: iso(2025, 8, 16),
    note: "On time",
    createdAt: iso(2025, 8, 16),
    receivedById: admin.id,
    receivedBy: { id: admin.id, name: admin.name },
  },
  // r-6 small payment
  {
    id: uid(),
    rentalId: "r-6",
    amount: 20,
    method: "CASH",
    paidAt: iso(2025, 8, 10),
    note: "Cash counter",
    createdAt: iso(2025, 8, 10),
    receivedById: admin.id,
    receivedBy: { id: admin.id, name: admin.name },
  },
];

// ---------- Admin “API” ----------
export async function getOverdue(): Promise<OverdueItem[]> {
  await wait(150);
  const items = rentals
    .map((r) => {
      const ps = payments.filter((p) => p.rentalId === r.id);
      const s = toSerializableSummary(
        summarizeRentalFront(r, ps, { graceDays: 0 })
      );
      return { rental: r, summary: s };
    })
    .filter((i) => i.summary.overdue && i.summary.balanceDue > 0)
    .sort((a, b) => b.summary.balanceDue - a.summary.balanceDue);

  return items;
}

export async function getRentalPayments(
  rentalId: string
): Promise<{ payments: Payment[]; summary: BillingSummary }> {
  await wait(150);
  const r = rentals.find((x) => x.id === rentalId)!;
  const ps = payments
    .filter((p) => p.rentalId === rentalId)
    .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
  const s = toSerializableSummary(
    summarizeRentalFront(r, ps, { graceDays: 0 })
  );
  return { payments: ps, summary: s };
}

export async function createPayment(
  rentalId: string,
  payload: {
    amount: number;
    method: PaymentMethod;
    paidAt?: string;
    note?: string;
  }
): Promise<{ payment: Payment; summary: BillingSummary }> {
  await wait(150);
  const r = rentals.find((x) => x.id === rentalId)!;
  const paidAt = payload.paidAt
    ? new Date(payload.paidAt).toISOString()
    : new Date().toISOString();
  const p: Payment = {
    id: uid(),
    rentalId,
    amount: payload.amount,
    method: payload.method,
    paidAt,
    note: payload.note,
    createdAt: new Date().toISOString(),
    receivedById: admin.id,
    receivedBy: { id: admin.id, name: admin.name },
  };
  payments = [p, ...payments];
  const ps = payments.filter((x) => x.rentalId === rentalId);
  const s = toSerializableSummary(
    summarizeRentalFront(r, ps, { graceDays: 0 })
  );
  return { payment: p, summary: s };
}

// ---------- Tenant “API” ----------
export async function getMyBilling(): Promise<{
  rental: Rental;
  payments: Payment[];
  summary: BillingSummary;
}> {
  await wait(150);
  const r = rentals[0]; // pretend first is "my" rental
  const ps = payments
    .filter((p) => p.rentalId === r.id)
    .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
  const s = toSerializableSummary(
    summarizeRentalFront(r, ps, { graceDays: 0 })
  );
  return { rental: r, payments: ps, summary: s };
}

export async function getMyPayments(): Promise<{
  rentals: { id: string; startDate: string; endDate: string }[];
  payments: Payment[];
}> {
  await wait(150);
  const r = rentals[0];
  const myPayments = payments
    .filter((p) => p.rentalId === r.id)
    .sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
  return {
    rentals: [{ id: r.id, startDate: r.startDate, endDate: r.endDate }],
    payments: myPayments,
  };
}

// ---------- helpers ----------
function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function toSerializableSummary(
  s: ReturnType<typeof summarizeRentalFront>
): BillingSummary {
  return {
    ...s,
    lastDueDate: new Date(s.lastDueDate).toISOString(),
    nextDueDate: new Date(s.nextDueDate).toISOString(),
  };
}
