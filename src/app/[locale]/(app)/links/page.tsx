"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListLinks, getStaff, hasPermission } from "@/lib/api";
import { StatusChip } from "@/components/status-chip";

export default function LinksPage() {
  const t = useTranslations("links");
  const tc = useTranslations("common");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(false);
  const can = hasPermission(getStaff(), "users:read");

  useEffect(() => {
    if (!can) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiListLinks(q, status);
        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data.total || 0);
          setErr(false);
        }
      } catch {
        if (!cancelled) setErr(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, status, can]);

  if (!can) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  return (
    <div className="space-y-4">
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
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            className="min-w-[220px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">{tc("allStatuses")}</option>
            <option value="linked">linked</option>
            <option value="pending">pending</option>
            <option value="revoked">revoked</option>
          </select>
        </div>
      </div>
      <div className="overflow-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">System</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">External ID</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : err ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--danger)]">
                  error
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={String(r.id)} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.phoneE164)}</td>
                  <td className="px-3 py-2">{String(r.systemCode)}</td>
                  <td className="px-3 py-2">{String(r.resourceType)}</td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.externalId)}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={String(r.status)} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {r.updatedAt ? new Date(String(r.updatedAt)).toLocaleString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
