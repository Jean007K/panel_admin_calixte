"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { apiListDevices, apiRevokeDevice, getStaff, hasPermission } from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";
import { StatusChip } from "@/components/status-chip";

export default function DevicesPage() {
  const t = useTranslations("devices");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const can = hasPermission(getStaff(), "devices:read");
  const canRevoke = hasPermission(getStaff(), "devices:revoke");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiListDevices(q, status, offset);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {total} {tc("total")}
          </p>
          {msg ? <p className="mt-1 text-sm text-[var(--text-muted)]">{msg}</p> : null}
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
            <option value="active">active</option>
            <option value="revoked">revoked</option>
            <option value="blocked">blocked</option>
          </select>
        </div>
      </div>
      <div className="overflow-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1280px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Model</th>
              <th className="px-3 py-3">{t("os")}</th>
              <th className="px-3 py-3">{t("app")}</th>
              <th className="px-3 py-3">{t("ip")}</th>
              <th className="px-3 py-3">{t("country")}</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">{t("firstSeen")}</th>
              <th className="px-3 py-3">Last seen</th>
              <th className="px-3 py-3">Installation</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr key={String(r.id)} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono-data text-xs">
                    {r.userId ? (
                      <Link
                        href={`/${locale}/users/${encodeURIComponent(String(r.userId))}`}
                        className="text-[var(--accent)] hover:underline"
                      >
                        {String(r.phoneE164)}
                      </Link>
                    ) : (
                      String(r.phoneE164)
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {String(r.deviceModel || "—")}
                    <span className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                      {String(r.platform || "")}
                    </span>
                  </td>
                  <td className="px-3 py-2">{String(r.osVersion || "—")}</td>
                  <td className="px-3 py-2">{String(r.appVersion || "—")}</td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.lastIp || "—")}</td>
                  <td className="px-3 py-2">{String(r.lastCountry || "—")}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={String(r.status)} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {r.firstSeenAt ? new Date(String(r.firstSeenAt)).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {r.lastSeenAt ? new Date(String(r.lastSeenAt)).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 font-mono-data text-xs">{String(r.installationId)}</td>
                  <td className="px-3 py-2 text-right">
                    {canRevoke && r.status === "active" ? (
                      <button
                        type="button"
                        className="text-xs text-[var(--danger)] hover:underline"
                        onClick={async () => {
                          try {
                            await apiRevokeDevice(String(r.id), "admin panel");
                            setMsg(t("revokeOk"));
                            await load();
                          } catch {
                            setMsg(t("revokeFailed"));
                          }
                        }}
                      >
                        {t("revoke")}
                      </button>
                    ) : null}
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
