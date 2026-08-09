"use client";

import { useEffect, useState } from "react";
import { buildWiseCsv, formatBankSummary, type BankDetails } from "@/lib/payouts";

interface PayoutRow {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at?: string | null;
  reference_id?: string | null;
  bank_details_snapshot?: BankDetails | null;
  creator_name?: string;
  creator_email?: string;
}

export function AdminPayoutsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requests, setRequests] = useState<PayoutRow[]>([]);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payouts/admin-list");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setRequests(data.requests || []);
      if (data.migrationRequired) {
        setError(data.message || "Migration required");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = requests.filter((r) => r.status === "pending");

  const exportWise = () => {
    const rows = pending.map((r) => {
      const bank = (r.bank_details_snapshot || {}) as BankDetails;
      return {
        recipientName: bank.recipientName || r.creator_name || "Creator",
        email: r.creator_email,
        country: bank.country,
        swiftBic: bank.swiftBic,
        ibanOrAccount: bank.ibanOrAccount,
        bankCode: bank.bankCode,
        amount: Number(r.amount),
        currency: r.currency || "usd",
        reference: `SITO-${r.id.slice(0, 8)}`,
      };
    });
    const csv = buildWiseCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sito-wise-payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const approve = async (id: string) => {
    setActing(id);
    setError("");
    try {
      const res = await fetch("/api/payouts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          action: "approve",
          referenceId: refs[id] || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActing(null);
    }
  };

  if (loading) return <div className="text-sm text-slate-400">Loading payout requests…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Bank transfer payouts</h2>
          <p className="mt-1 text-sm text-slate-400">
            Review international withdrawal requests, export for Wise, then mark as paid.
          </p>
        </div>
        <button
          type="button"
          onClick={exportWise}
          disabled={pending.length === 0}
          className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:opacity-40"
        >
          Export Wise CSV ({pending.length})
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
          No pending payout requests.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Request ID</th>
                <th className="px-3 py-3">Creator</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Currency</th>
                <th className="px-3 py-3">Bank</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((r) => (
                <tr key={r.id} className="border-t border-slate-800 align-top">
                  <td className="px-3 py-3 font-mono text-xs text-slate-400">{r.id.slice(0, 8)}…</td>
                  <td className="px-3 py-3">
                    <div className="text-slate-200">{r.creator_name}</div>
                    <div className="text-xs text-slate-500">{r.creator_email}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-100 font-semibold">
                    ${Number(r.amount).toFixed(2)}
                  </td>
                  <td className="px-3 py-3 uppercase text-slate-400">{r.currency}</td>
                  <td className="px-3 py-3 text-xs text-slate-400 max-w-[220px]">
                    {formatBankSummary(r.bank_details_snapshot)}
                  </td>
                  <td className="px-3 py-3 text-slate-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-3 space-y-2 min-w-[200px]">
                    <input
                      placeholder="Transfer reference ID"
                      value={refs[r.id] || ""}
                      onChange={(e) => setRefs({ ...refs, [r.id]: e.target.value })}
                      className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100"
                    />
                    <button
                      type="button"
                      disabled={acting === r.id}
                      onClick={() => approve(r.id)}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {acting === r.id ? "Processing…" : "Approve & Mark as Paid"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {requests.some((r) => r.status !== "pending") && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Recent history</h3>
          <ul className="space-y-2 text-sm text-slate-400">
            {requests
              .filter((r) => r.status !== "pending")
              .slice(0, 20)
              .map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-800 px-3 py-2">
                  <span className="capitalize text-slate-300">{r.status}</span> · {r.creator_name} · $
                  {Number(r.amount).toFixed(2)} · {new Date(r.created_at).toLocaleDateString()}
                  {r.reference_id ? ` · ref ${r.reference_id}` : ""}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
