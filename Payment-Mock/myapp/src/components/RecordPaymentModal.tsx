// src/components/RecordPaymentModal.tsx
import { useState } from "react";
import { PaymentMethod } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    method: PaymentMethod;
    paidAt?: string;
    note?: string;
  }) => Promise<void>;
  suggestedAmount?: number;
};

export default function RecordPaymentModal({
  open,
  onClose,
  onSubmit,
  suggestedAmount,
}: Props) {
  const [amount, setAmount] = useState(suggestedAmount ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  const [paidAt, setPaidAt] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setErr("");
      await onSubmit({
        amount: Number(amount),
        method,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        note: note || undefined,
      });
      onClose();
      setAmount(suggestedAmount ?? 0);
      setPaidAt("");
      setNote("");
    } catch (e: any) {
      setErr(e.message || "Failed to record payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="bg-white rounded shadow-lg p-4 w-full max-w-md space-y-3"
      >
        <h3 className="text-lg font-semibold">Record Payment</h3>

        <label className="block">
          <span className="text-sm text-gray-600">Amount (AUD)</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="mt-1 w-full border rounded p-2"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Method</span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="mt-1 w-full border rounded p-2"
          >
            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            <option value="CASH">CASH</option>
            <option value="CARD">CARD</option>
            <option value="UPI">UPI</option>
            <option value="OTHER">OTHER</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Paid At (optional)</span>
          <input
            type="datetime-local"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mt-1 w-full border rounded p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-600">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1 w-full border rounded p-2"
          />
        </label>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded border"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-3 py-2 rounded bg-black text-white"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
