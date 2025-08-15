import { BillingSummary } from "../types";

const fmtMoney = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export default function BillingSummaryCard({ s }: { s: BillingSummary }) {
  const paidPct =
    s.dueToDate > 0 ? Math.min(100, (s.totalPaid / s.dueToDate) * 100) : 0;
  const duePct =
    s.dueToDate > 0
      ? Math.max(0, Math.min(100, (s.balanceDue / s.dueToDate) * 100))
      : 0;

  return (
    <div className="card card-accent" style={{ padding: 20 }}>
      <div className="kv" style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Billing Summary</div>
        <div className={`chip ${s.overdue ? "danger" : "ok"}`}>
          {s.overdue ? "Overdue" : "Up to date"}
        </div>
      </div>

      <div className="grid grid-3">
        <Metric label="Accrued (to date)" value={fmtMoney(s.accruedToDate)} />
        <Metric label="Due (fortnightly)" value={fmtMoney(s.dueToDate)} />
        <Metric label="Paid (to date)" value={fmtMoney(s.totalPaid)} />
        <Metric
          label="Balance Due"
          value={fmtMoney(s.balanceDue)}
          highlight={s.overdue}
        />
        <Metric label="Unbilled Accrued" value={fmtMoney(s.unbilledAccrued)} />
        <Metric label="Fortnights Elapsed" value={s.fortnightsElapsed} />
      </div>

      {/* Progress towards due */}
      <div style={{ marginTop: 14 }}>
        <div className="kv small">
          <div>Progress toward current due</div>
          <div>{Math.round(paidPct)}% paid</div>
        </div>
        <div className="meter" style={{ marginTop: 8 }}>
          <span className="paid" style={{ width: `${paidPct}%` }} />
          <span
            className="due"
            style={{ left: `${paidPct}%`, width: `${duePct}%` }}
          />
        </div>
      </div>

      <div className="kv small" style={{ marginTop: 12 }}>
        <div>
          Last due date: <span className="mono">{fmtDate(s.lastDueDate)}</span>
        </div>
        <div>
          Next due date: <span className="mono">{fmtDate(s.nextDueDate)}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className="metric"
      style={{ borderColor: highlight ? "rgba(255,107,107,.35)" : undefined }}
    >
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
