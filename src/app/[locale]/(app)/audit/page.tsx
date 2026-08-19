"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListAudit, getStaff, hasPermission } from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";

export default function AuditPage() {
  const t = useTranslations("audit");
  const tc = useTranslations("common");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const can = hasPermission(getStaff(), "audit:read");

  useEffect(() => {
    if (!can) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiListAudit(q, "", offset);
        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data.total || 0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, offset, can]);

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
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOffset(0);
          }}
          placeholder={t("search")}
          className="min-w-[260px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
      </div>
      <div className="overflow-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1000px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-3">When</th>
              <th className="px-3 py-3">Actor</th>
              <th className="px-3 py-3">Action</th>
              <th className="px-3 py-3">Resource</th>
              <th className="px-3 py-3">Correlation</th>
              <th className="px-3 py-3">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
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
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {r.occurredAt ? new Date(String(r.occurredAt)).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.actorId)}</td>
                  <td className="px-3 py-2">{String(r.action)}</td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.resource)}</td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.correlationId || "—")}</td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.remoteIp || "—")}</td>
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
