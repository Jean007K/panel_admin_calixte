"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListLoanSimulations, getStaff, hasPermission, type LoanSimulationAdmin } from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";

function formatMinor(amountMinor: number) {
  return (amountMinor / 100).toLocaleString("es-DO", { minimumFractionDigits: 2 });
}

export default function ConfigLoanSimulationsPage() {
  const t = useTranslations("config.simulations");
  const tc = useTranslations("common");
  const canRead = hasPermission(getStaff(), "loans:simulations:read");
  const [items, setItems] = useState<LoanSimulationAdmin[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    (async () => {
      setLoading(true);
      try {
        const data = await apiListLoanSimulations(offset);
        setItems(data.items || []);
        setTotal(data.total || data.items?.length || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, [canRead, offset]);

  if (!canRead) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
      </div>

      <div className="overflow-x-auto border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">{t("phone")}</th>
              <th className="px-3 py-2">{t("amount")}</th>
              <th className="px-3 py-2">{t("months")}</th>
              <th className="px-3 py-2">{t("rateBps")}</th>
              <th className="px-3 py-2">{t("payment")}</th>
              <th className="px-3 py-2">{t("createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((s) => (
                <tr key={s.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono-data text-xs">{s.phone || s.userId}</td>
                  <td className="px-3 py-2 font-mono-data">{formatMinor(s.amountMinor)}</td>
                  <td className="px-3 py-2">{s.months}</td>
                  <td className="px-3 py-2 font-mono-data">{s.rateBps}</td>
                  <td className="px-3 py-2 font-mono-data">{formatMinor(s.paymentMinor)}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">
                    {s.createdAt ? new Date(s.createdAt).toLocaleString() : "—"}
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
