"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { apiListSupport, apiSetSupportStatus, getStaff, hasPermission } from "@/lib/api";
import { PaginationBar } from "@/components/pagination-bar";
import { StatusChip } from "@/components/status-chip";

export default function SupportPage() {
  const locale = useLocale();
  const can = hasPermission(getStaff(), "users:read");
  const canWrite = hasPermission(getStaff(), "users:update_status");
  const [status, setStatus] = useState("open");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiListSupport(status, offset);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!can) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, offset, can]);

  if (!can) return <p className="text-sm text-[var(--danger)]">Sin permiso</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Soporte</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Clientes que pidieron asistencia desde la app
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="open">open</option>
          <option value="seen">seen</option>
          <option value="closed">closed</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded border border-[var(--border)]">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Mensaje</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-6 text-[var(--text-muted)]" colSpan={5}>
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-[var(--text-muted)]" colSpan={5}>
                  Sin solicitudes
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={String(row.id)} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">
                    <Link
                      href={`/${locale}/users/${row.userId}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      {String(row.displayName || row.phoneE164 || row.userId)}
                    </Link>
                    <div className="text-xs text-[var(--text-muted)]">{String(row.phoneE164 || "")}</div>
                  </td>
                  <td className="px-3 py-2">{String(row.message || "")}</td>
                  <td className="px-3 py-2">
                    <StatusChip status={String(row.status || "")} />
                  </td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{String(row.createdAt || "")}</td>
                  <td className="px-3 py-2 text-right">
                    {canWrite && row.status !== "closed" ? (
                      <button
                        type="button"
                        disabled={busy === row.id}
                        onClick={async () => {
                          setBusy(String(row.id));
                          await apiSetSupportStatus(String(row.id), row.status === "open" ? "seen" : "closed");
                          setBusy("");
                          void load();
                        }}
                        className="rounded border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-2)]"
                      >
                        {row.status === "open" ? "Marcar visto" : "Cerrar"}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar offset={offset} total={total} onPage={setOffset} />
    </div>
  );
}
