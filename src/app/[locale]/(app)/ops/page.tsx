"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListTransfers, apiSystemHealth, getStaff, hasPermission } from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";
import { StatusChip } from "@/components/status-chip";

export default function OpsPage() {
  const t = useTranslations("ops");
  const tc = useTranslations("common");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthBusy, setHealthBusy] = useState(false);
  const can = hasPermission(getStaff(), "ops:read");

  const loadHealth = async () => {
    setHealthBusy(true);
    try {
      setHealth(await apiSystemHealth());
    } finally {
      setHealthBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const jobs = await apiListTransfers(q, status, offset);
      setItems(jobs.items || []);
      setTotal(jobs.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!can) return;
    void loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [can]);

  useEffect(() => {
    if (!can) return;
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, offset, can]);

  if (!can) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {total} {tc("total")}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOffset(0);
            }}
            placeholder={t("search")}
            className="min-w-[220px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{tc("allStatuses")}</option>
            <option value="queued">queued</option>
            <option value="processing">processing</option>
            <option value="posted">posted</option>
            <option value="failed">failed</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
          >
            {t("refresh")}
          </button>
        </div>
      </div>

      <section className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">{t("health")}</h2>
          <button
            type="button"
            onClick={() => void loadHealth()}
            className="text-xs text-[var(--text-muted)] hover:underline"
            disabled={healthBusy}
          >
            {t("refresh")}
          </button>
        </div>
        {health ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            {["live", "redis", "postgres", "fineract"].map((k) => (
              <div key={k}>
                <dt className="text-xs uppercase text-[var(--text-muted)]">{k}</dt>
                <dd className="mt-0.5">{health[k] === false ? t("healthDown") : t("healthUp")}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-muted)]">{tc("loading")}</p>
        )}
      </section>

      <div className="overflow-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-3">Job</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Amount</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Attempts</th>
              <th className="px-3 py-3">Error</th>
              <th className="px-3 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={String(r.id)} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.id)}</td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.phoneE164 || "—")}</td>
                  <td className="px-3 py-2">
                    {String(r.amountMinor)} {String(r.currency)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip status={String(r.status)} />
                  </td>
                  <td className="px-3 py-2">{String(r.attempts)}</td>
                  <td className="max-w-[220px] truncate px-3 py-2 text-xs text-[var(--danger)]">
                    {String(r.lastError || "—")}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {r.createdAt ? new Date(String(r.createdAt)).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar total={total} limit={PAGE_SIZE} offset={offset} onPage={setOffset} />
    </div>
  );
}
