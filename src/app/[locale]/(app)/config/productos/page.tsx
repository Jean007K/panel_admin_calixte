"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListProductsAdmin, getStaff, hasPermission, type ProductDefAdmin } from "@/lib/api";

export default function ConfigProductsPage() {
  const t = useTranslations("config.products");
  const tc = useTranslations("common");
  const canRead = hasPermission(getStaff(), "products:read");
  const [items, setItems] = useState<ProductDefAdmin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    (async () => {
      setLoading(true);
      try {
        const data = await apiListProductsAdmin();
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [canRead]);

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
              <th className="px-3 py-2">{t("code")}</th>
              <th className="px-3 py-2">{t("name")}</th>
              <th className="px-3 py-2">{t("kind")}</th>
              <th className="px-3 py-2">{t("currency")}</th>
              <th className="px-3 py-2">{t("fineractId")}</th>
              <th className="px-3 py-2">{t("iconKey")}</th>
              <th className="px-3 py-2">{t("sortOrder")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono-data text-xs">{p.code}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{p.kind}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{p.currency}</td>
                  <td className="px-3 py-2 font-mono-data">{p.fineractProductId ?? "—"}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{p.iconKey}</td>
                  <td className="px-3 py-2 font-mono-data">{p.sortOrder}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
