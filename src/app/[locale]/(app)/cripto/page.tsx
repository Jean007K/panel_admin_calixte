"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { apiListCryptoWallets, getStaff, hasPermission, type AdminCryptoRow } from "@/lib/api";

function statusLabel(status: string, t: (k: string) => string) {
  if (status === "active") return t("statusActive");
  if (status === "disabled") return t("statusDisabled");
  if (status === "pending") return t("statusPending");
  return status || "—";
}

export default function CryptoDeskPage() {
  const t = useTranslations("users.crypto");
  const tc = useTranslations("common");
  const locale = useLocale();
  const canRead = hasPermission(getStaff(), "users:read");
  const [items, setItems] = useState<AdminCryptoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "load" | null>(null);

  useEffect(() => {
    if (!canRead) {
      setError("forbidden");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiListCryptoWallets();
        if (!cancelled) setItems(data.items || []);
      } catch (e) {
        if (!cancelled) setError((e as { code?: number }).code === 403 ? "forbidden" : "load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRead]);

  if (error === "forbidden") {
    return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("pageLead")}</p>
      </div>
      <div className="overflow-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-3">{t("colName")}</th>
              <th className="px-3 py-3">{t("colPhone")}</th>
              <th className="px-3 py-3">{t("colModel")}</th>
              <th className="px-3 py-3">{t("colAddress")}</th>
              <th className="px-3 py-3">{t("colStatus")}</th>
              <th className="px-3 py-3">{t("colUpdated")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : error === "load" ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--danger)]">
                  {t("loadError")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-[var(--text-muted)]">
                  {t("emptyList")}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.userId} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <Link href={`/${locale}/users/${row.userId}`} className="text-[var(--accent)] hover:underline">
                      {row.displayName || row.phoneE164}
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-mono-data">{row.phoneE164}</td>
                  <td className="px-3 py-3">{row.deviceModel || "—"}</td>
                  <td className="px-3 py-3 font-mono-data text-xs">{row.walletAddress || "—"}</td>
                  <td className="px-3 py-3">{statusLabel(row.pilotStatus, t)}</td>
                  <td className="px-3 py-3">
                    {row.updatedAt ? new Date(row.updatedAt).toLocaleString(locale) : "—"}
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
