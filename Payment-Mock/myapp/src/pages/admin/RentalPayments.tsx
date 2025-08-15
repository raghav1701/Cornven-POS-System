// src/pages/admin/RentalPayments.tsx
import { useEffect, useState } from "react";
import { createPayment, getRentalPayments } from "../../mockApi";
import { BillingSummary, Payment } from "../../types";
import BillingSummaryCard from "../../components/BillingSummaryCard";
import PaymentTable from "../../components/PaymentTable";
import RecordPaymentModal from "../../components/RecordPaymentModal";
import { useParams, Link } from "react-router-dom";

export default function RentalPayments() {
  const { rentalId } = useParams<{ rentalId: string }>();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!rentalId) return;
    setErr("");
    const { payments, summary } = await getRentalPayments(rentalId);
    setPayments(payments);
    setSummary(summary);
  }

  useEffect(() => {
    load().catch((e) => setErr(String(e)));
  }, [rentalId]);

  const onSubmit = async (payload: {
    amount: number;
    method: any;
    paidAt?: string;
    note?: string;
  }) => {
    if (!rentalId) return;
    await createPayment(rentalId, payload);
    await load();
  };

  if (!rentalId) return <div className="container">Missing rentalId.</div>;
  if (!summary) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <div className="kv" style={{ marginBottom: 12 }}>
        <div className="page-title" style={{ margin: 0 }}>
          Rental Payments
        </div>
        <div className="chips">
          <Link to="/admin/overdue" className="btn btn-ghost">
            ← Back
          </Link>
          <button className="btn btn-primary" onClick={() => setOpen(true)}>
            Record Payment
          </button>
        </div>
      </div>

      {err && (
        <div
          className="card"
          style={{ borderColor: "rgba(255,107,107,.4)", marginBottom: 12 }}
        >
          {err}
        </div>
      )}

      <BillingSummaryCard s={summary} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="kv" style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 700 }}>Payment History</div>
        </div>
        <div className="overflow-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Received By</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {payments.length ? (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.paidAt).toLocaleString()}</td>
                    <td className="mono">
                      {p.amount.toLocaleString(undefined, {
                        style: "currency",
                        currency: "AUD",
                      })}
                    </td>
                    <td>{p.method}</td>
                    <td>{p.receivedBy?.name ?? "—"}</td>
                    <td>{p.note ?? "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="small">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordPaymentModal
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={onSubmit}
        suggestedAmount={
          summary.balanceDue > 0 ? summary.balanceDue : undefined
        }
      />
    </div>
  );
}
