// src/pages/admin/OverdueList.tsx
import { useEffect, useMemo, useState } from "react";
import { getOverdue } from "../../mockApi";
import { OverdueItem } from "../../types";
import BillingSummaryCard from "../../components/BillingSummaryCard";
import { Link } from "react-router-dom";

const money = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "AUD" });

export default function OverdueList() {
  const [items, setItems] = useState<OverdueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await getOverdue();
        setItems(data);
      } catch (e: any) {
        setErr(e.message || "Failed to load overdue rentals");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const s = q.toLowerCase();
    return items.filter(
      ({ rental }) =>
        rental.tenant.user.name.toLowerCase().includes(s) ||
        rental.tenant.user.email.toLowerCase().includes(s) ||
        rental.cube.code.toLowerCase().includes(s)
    );
  }, [q, items]);

  const totals = useMemo(() => {
    const count = filtered.length;
    const due = filtered.reduce((sum, i) => sum + i.summary.balanceDue, 0);
    return { count, due };
  }, [filtered]);

  if (loading) return <div className="container">Loading…</div>;
  if (err)
    return (
      <div className="container">
        <div className="card">{err}</div>
      </div>
    );

  return (
    <div className="container">
      <div className="page-title">Overdue Rentals</div>

      {/* Summary header */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="grid grid-3">
          <div className="metric">
            <div className="label">Overdue count</div>
            <div className="value">{totals.count}</div>
          </div>
          <div className="metric">
            <div className="label">Total balance due</div>
            <div className="value">{money(totals.due)}</div>
          </div>
          <div className="metric">
            <div className="label">Search</div>
            <input
              placeholder="Search name, email, cube…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,.03)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </div>

      {!filtered.length && <div className="card">No matches.</div>}

      <div className="grid" style={{ gap: 16 }}>
        {filtered.map(({ rental, summary }) => (
          <div key={rental.id} className="card">
            <div className="kv" style={{ marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {rental.tenant.user.name}{" "}
                  <span className="small">({rental.tenant.user.email})</span>
                </div>
                <div className="small">
                  Cube {rental.cube.code} • Daily {money(rental.dailyRent)}
                </div>
              </div>
              <Link
                to={`/admin/rentals/${rental.id}`}
                className="btn btn-primary"
              >
                Manage
              </Link>
            </div>
            <BillingSummaryCard s={summary} />
          </div>
        ))}
      </div>
    </div>
  );
}
