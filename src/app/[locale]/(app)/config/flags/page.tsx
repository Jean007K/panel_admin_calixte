"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListFlags, apiUpsertFlag, getStaff, hasPermission } from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";

type Flag = { key: string; enabled: boolean; value: unknown; updatedAt: string };

export default function ConfigFlagsPage() {
  const t = useTranslations("flags");
  const tc = useTranslations("common");
  const [items, setItems] = useState<Flag[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const can = hasPermission(getStaff(), "flags:read");
  const canWrite = hasPermission(getStaff(), "flags:write");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiListFlags();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can) void load();
  }, [can]);

  if (!can) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">{t("title")}</h1>
        {msg ? <p className="mt-1 text-sm text-[var(--text-muted)]">{msg}</p> : null}
      </div>
      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">{t("enabled")}</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.slice(offset, offset + PAGE_SIZE).map((f) => (
                <tr key={f.key} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-mono-data text-xs">{f.key}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={f.enabled}
                      disabled={!canWrite}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.key === f.key ? { ...x, enabled: e.target.checked } : x)),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {f.updatedAt ? new Date(f.updatedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canWrite ? (
                      <button
                        type="button"
                        className="rounded bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-fg)]"
                        onClick={async () => {
                          await apiUpsertFlag(f.key, f.enabled, f.value || {});
                          setMsg(t("saved"));
                          await load();
                        }}
                      >
                        {t("save")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar total={items.length} limit={PAGE_SIZE} offset={offset} onPage={setOffset} />
    </div>
  );
}
