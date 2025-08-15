// src/pages/tenant/MyPayments.tsx
import { useEffect, useState } from "react";
import { getMyPayments } from "../../mockApi";
import PaymentTable from "../../components/PaymentTable";
import { Payment } from "../../types";

export default function MyPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { payments } = await getMyPayments();
        setPayments(payments);
      } catch (e: any) {
        setErr(e.message || "Failed to load payments");
      }
    })();
  }, []);

  if (err) return <div className="text-red-600">{err}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">My Payments</h2>
      <PaymentTable payments={payments} />
    </div>
  );
}
