// src/pages/tenant/MyBilling.tsx
import { useEffect, useState } from "react";
import { getMyBilling } from "../../mockApi";
import { BillingSummary, Payment } from "../../types";
import BillingSummaryCard from "../../components/BillingSummaryCard";
import PaymentTable from "../../components/PaymentTable";

export default function MyBilling() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { payments, summary } = await getMyBilling();
        setPayments(payments);
        setSummary(summary);
      } catch (e: any) {
        setErr(e.message || "Failed to load billing");
      }
    })();
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;
  if (!summary) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Billing</h2>
      <BillingSummaryCard s={summary} />
      <PaymentTable payments={payments} />
    </div>
  );
}
