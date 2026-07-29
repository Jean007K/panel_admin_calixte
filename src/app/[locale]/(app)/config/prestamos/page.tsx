"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGetLoanTip, apiPutLoanTip, getStaff, hasPermission, type LoanTipConfig } from "@/lib/api";

const empty: LoanTipConfig = {
  title: "",
  heroRateLabel: "",
  heroRateCaption: "",
  maxAmountLabel: "",
  maxTermLabel: "",
  sectionTitle: "",
  interestMeta: "",
  disclaimer: "",
  rateBps: 0,
  minMonths: 1,
  maxMonths: 12,
  maxAmountMinor: 0,
  minAmountMinor: 0,
  tipRatesDisplay: [],
};

export default function ConfigLoansPage() {
  const t = useTranslations("config.loans");
  const canRead = hasPermission(getStaff(), "loans:config");
  const canWrite = hasPermission(getStaff(), "loans:config");
  const [form, setForm] = useState<LoanTipConfig>(empty);
  const [tipRatesRaw, setTipRatesRaw] = useState("[]");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canRead) return;
    (async () => {
      try {
        const cfg = await apiGetLoanTip();
        setForm({ ...empty, ...cfg });
        setTipRatesRaw(JSON.stringify(cfg.tipRatesDisplay ?? [], null, 2));
      } catch (err) {
        setMsg((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [canRead]);

  if (!canRead) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setMsg("");
    try {
      let tipRatesDisplay: Record<string, unknown>[] = [];
      if (tipRatesRaw.trim()) {
        tipRatesDisplay = JSON.parse(tipRatesRaw);
      }
      await apiPutLoanTip({ ...form, tipRatesDisplay });
      setMsg(t("saved"));
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const textFields: [keyof LoanTipConfig, string][] = [
    ["title", t("fieldTitle")],
    ["heroRateLabel", t("heroRateLabel")],
    ["heroRateCaption", t("heroRateCaption")],
    ["maxAmountLabel", t("maxAmountLabel")],
    ["maxTermLabel", t("maxTermLabel")],
    ["sectionTitle", t("sectionTitle")],
    ["interestMeta", t("interestMeta")],
  ];

  const numberFields: [keyof LoanTipConfig, string][] = [
    ["rateBps", t("rateBps")],
    ["minMonths", t("minMonths")],
    ["maxMonths", t("maxMonths")],
    ["minAmountMinor", t("minAmountMinor")],
    ["maxAmountMinor", t("maxAmountMinor")],
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-2xl tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">…</p>
      ) : (
        <form onSubmit={onSave} className="grid gap-3 border border-[var(--border)] p-4 md:grid-cols-2">
          {textFields.map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <input
                value={String(form[key] ?? "")}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                disabled={!canWrite}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
          ))}
          {numberFields.map(([key, label]) => (
            <label key={key} className="space-y-1 text-sm">
              <span>{label}</span>
              <input
                type="number"
                value={Number(form[key] ?? 0)}
                onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                disabled={!canWrite}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
          ))}
          <label className="space-y-1 text-sm md:col-span-2">
            <span>{t("disclaimer")}</span>
            <textarea
              value={form.disclaimer}
              onChange={(e) => setForm((f) => ({ ...f, disclaimer: e.target.value }))}
              disabled={!canWrite}
              rows={3}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span>{t("tipRatesDisplay")}</span>
            <p className="text-xs text-[var(--text-muted)]">{t("tipRatesHint")}</p>
            <textarea
              value={tipRatesRaw}
              onChange={(e) => setTipRatesRaw(e.target.value)}
              disabled={!canWrite}
              rows={10}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono-data text-xs"
            />
          </label>
          {msg ? <p className="md:col-span-2 text-sm text-[var(--text-muted)]">{msg}</p> : null}
          {canWrite ? (
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
              >
                {t("save")}
              </button>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
