"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  apiGetCryptoDesk,
  apiListCryptoWallets,
  apiPutCryptoDesk,
  getStaff,
  hasPermission,
  type AdminCryptoRow,
  type CryptoDeskGates,
} from "@/lib/api";

function minorToUsdc(value: number) {
  if (!value) return "";
  const raw = (value / 1_000_000).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return raw.includes(".") && raw.split(".")[1].length < 2 ? Number(raw).toFixed(2) : raw;
}

function DeskPrices({ canWrite }: { canWrite: boolean }) {
  const t = useTranslations("users.crypto");
  const [fee, setFee] = useState("");
  const [baseReady, setBaseReady] = useState(false);
  const [gates, setGates] = useState<CryptoDeskGates | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetCryptoDesk();
        if (cancelled) return;
        setGates(data);
        setFee(minorToUsdc(data.desk?.sendFeeUsdcMinor ?? 0));
        setBaseReady(Boolean(data.desk?.baseReady));
      } catch {
        if (!cancelled) setNote(t("loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function save() {
    setSaving(true);
    setNote(null);
    try {
      const data = await apiPutCryptoDesk({
        buyHtg: "",
        sellHtg: "",
        sendFeeUsdc: fee.trim(),
        ethBuyHtg: "",
        ethSellHtg: "",
        baseReady,
      });
      setGates(data);
      setNote(t("savedPrices"));
    } catch (e) {
      setNote((e as { code?: number }).code === 403 ? t("needContent") : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded border border-[var(--border)] bg-[var(--surface)] p-4">
      <div>
        <h2 className="text-base font-medium">{t("pricesTitle")}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("pricesLead")}</p>
      </div>
      <label className="block text-sm">
        {t("sendFee")}
        <input
          value={fee}
          onChange={(e) => setFee(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={baseReady}
          disabled={!canWrite}
          onChange={(e) => setBaseReady(e.target.checked)}
        />
        {t("baseReady")}
      </label>
      {canWrite ? (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded border border-[var(--border)] px-4 py-2 text-sm"
        >
          {t("savePrices")}
        </button>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t("needContent")}</p>
      )}
      {note ? <p className="text-sm text-[var(--text-muted)]">{note}</p> : null}
      {gates ? (
        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
          <li>
            {t("sendClosed")}: {gates.sendOpen ? t("gateOpen") : gates.sendClosed || "—"}
          </li>
          <li>
            {t("sellClosed")}: {gates.sellOpen ? t("gateOpen") : gates.sellClosed || "—"}
          </li>
          <li>
            {t("buyClosed")}: {gates.buyOpen ? t("gateOpen") : gates.buyClosed || "—"}
          </li>
          <li>
            {t("ethBuyClosed")}: {gates.ethBuyOpen ? t("gateOpen") : gates.ethBuyClosed || "—"}
          </li>
          <li>
            {t("ethSellClosed")}: {gates.ethSellOpen ? t("gateOpen") : gates.ethSellClosed || "—"}
          </li>
        </ul>
      ) : null}
      <div>
        <h3 className="text-sm font-medium">{t("opsTitle")}</h3>
        <ul className="mt-2 space-y-1 text-sm text-[var(--text-muted)]">
          <li>{t("opsBuy")}</li>
          <li>{t("opsFee")}</li>
          <li>{t("opsToll")}</li>
          <li>{t("opsSol")}</li>
          <li>{t("opsOther")}</li>
        </ul>
      </div>
    </section>
  );
}

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
  const canWrite = hasPermission(getStaff(), "content:write");
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
      <DeskPrices canWrite={canWrite} />
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
