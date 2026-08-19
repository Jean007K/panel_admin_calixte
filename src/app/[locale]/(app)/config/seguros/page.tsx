"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  apiDeleteInsurance,
  apiListInsurance,
  apiUpsertInsurance,
  getStaff,
  hasPermission,
  type InsuranceProductAdmin,
} from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";

const empty: Partial<InsuranceProductAdmin> = {
  code: "",
  title: "",
  subtitle: "",
  priceLabel: "",
  interestLabel: "",
  iconKey: "",
  sortOrder: 0,
  active: true,
};

export default function ConfigInsurancePage() {
  const t = useTranslations("config.insurance");
  const tc = useTranslations("common");
  const canRead = hasPermission(getStaff(), "content:read");
  const canWrite = hasPermission(getStaff(), "insurance:write");
  const [items, setItems] = useState<InsuranceProductAdmin[]>([]);
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<Partial<InsuranceProductAdmin>>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiListInsurance();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

  if (!canRead) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setMsg("");
    try {
      const payload: Partial<InsuranceProductAdmin> = {
        code: form.code || "",
        title: form.title || "",
        subtitle: form.subtitle || "",
        priceLabel: form.priceLabel || "",
        interestLabel: form.interestLabel || "",
        iconKey: form.iconKey || "",
        sortOrder: Number(form.sortOrder) || 0,
        active: form.active !== false,
      };
      if (editingId) payload.id = editingId;
      await apiUpsertInsurance(payload);
      setForm(empty);
      setEditingId(null);
      setMsg(t("saved"));
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
        {msg ? <p className="mt-2 text-sm text-[var(--text-muted)]">{msg}</p> : null}
      </div>

      {canWrite ? (
        <form onSubmit={onSubmit} className="grid gap-3 border border-[var(--border)] p-4 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-semibold">
            {editingId ? t("save") : t("new")}
          </h2>
          {(
            [
              ["code", t("code")],
              ["title", t("titleField")],
              ["subtitle", t("subtitleField")],
              ["priceLabel", t("priceLabel")],
              ["interestLabel", t("interestLabel")],
              ["iconKey", t("iconKey")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <input
                value={String(form[key] ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                required={key === "code" || key === "title"}
              />
            </label>
          ))}
          <label className="space-y-1 text-sm">
            <span>{t("sortOrder")}</span>
            <input
              type="number"
              value={form.sortOrder ?? 0}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              {t("active")}
            </label>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {t("save")}
            </button>
            {editingId ? (
              <button
                type="button"
                className="rounded border border-[var(--border)] px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                }}
              >
                {tc("cancel")}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">{t("titleField")}</th>
              <th className="px-3 py-2">{t("code")}</th>
              <th className="px-3 py-2">{t("priceLabel")}</th>
              <th className="px-3 py-2">{t("active")}</th>
              <th className="px-3 py-2">{t("sortOrder")}</th>
              <th className="px-3 py-2" />
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
              items.slice(offset, offset + PAGE_SIZE).map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{p.title}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{p.code}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{p.priceLabel}</td>
                  <td className="px-3 py-2">{p.active ? "✓" : "—"}</td>
                  <td className="px-3 py-2 font-mono-data">{p.sortOrder}</td>
                  <td className="px-3 py-2 text-right space-x-2">
                    {canWrite ? (
                      <>
                        <button
                          type="button"
                          className="text-xs text-[var(--accent)] hover:underline"
                          onClick={() => {
                            setEditingId(p.id);
                            setForm(p);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-[var(--danger)] hover:underline"
                          onClick={async () => {
                            await apiDeleteInsurance(p.id);
                            setMsg(t("deleted"));
                            await load();
                          }}
                        >
                          {t("delete")}
                        </button>
                      </>
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
