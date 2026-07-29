"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  apiCreatePromo,
  apiDeletePromo,
  apiListPromosAdmin,
  apiUpdatePromo,
  getStaff,
  hasPermission,
  type PromoAdmin,
} from "@/lib/api";

const empty: Partial<PromoAdmin> = {
  tag: "",
  title: "",
  excerpt: "",
  cta: "",
  ctaLabel: "",
  featured: false,
  sortOrder: 0,
  enabled: true,
  locale: "es",
};

export default function ConfigAdsPage() {
  const t = useTranslations("config.ads");
  const tc = useTranslations("common");
  const canRead = hasPermission(getStaff(), "content:read");
  const canWrite = hasPermission(getStaff(), "content:write");
  const [items, setItems] = useState<PromoAdmin[]>([]);
  const [form, setForm] = useState<Partial<PromoAdmin>>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiListPromosAdmin();
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
      const payload = {
        tag: form.tag || "",
        title: form.title || "",
        excerpt: form.excerpt || "",
        cta: form.cta || "",
        ctaLabel: form.ctaLabel || "",
        featured: !!form.featured,
        sortOrder: Number(form.sortOrder) || 0,
        enabled: form.enabled !== false,
        locale: form.locale || "es",
      };
      if (editingId) {
        await apiUpdatePromo(editingId, payload);
      } else {
        await apiCreatePromo(payload);
      }
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
              ["tag", t("tag")],
              ["title", t("titleField")],
              ["excerpt", t("excerpt")],
              ["cta", t("cta")],
              ["ctaLabel", t("ctaLabel")],
              ["locale", t("locale")],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <input
                value={String(form[key] ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                required={key === "title"}
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
                checked={!!form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              />
              {t("enabled")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!form.featured}
                onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
              />
              {t("featured")}
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
              <th className="px-3 py-2">{t("tag")}</th>
              <th className="px-3 py-2">{t("enabled")}</th>
              <th className="px-3 py-2">{t("sortOrder")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{p.title}</td>
                  <td className="px-3 py-2 text-[var(--text-muted)]">{p.tag}</td>
                  <td className="px-3 py-2">{p.enabled ? "✓" : "—"}</td>
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
                            await apiDeletePromo(p.id);
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
    </div>
  );
}
