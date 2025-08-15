// src/components/PaymentTable.tsx

import { Payment } from "../types";

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
const fmtDT = (iso: string) => new Date(iso).toLocaleString();

export default function PaymentTable({ payments }: { payments: Payment[] }) {
  if (!payments.length)
    return <div className="text-gray-500">No payments yet.</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-left">Amount</th>
            <th className="p-2 text-left">Method</th>
            <th className="p-2 text-left">Received By</th>
            <th className="p-2 text-left">Note</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">{fmtDT(p.paidAt)}</td>
              <td className="p-2 font-medium">{fmtMoney(p.amount)}</td>
              <td className="p-2">{p.method}</td>
              <td className="p-2">{p.receivedBy?.name ?? "—"}</td>
              <td className="p-2">{p.note ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
