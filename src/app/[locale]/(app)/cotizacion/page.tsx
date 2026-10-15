"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGetCryptoDesk, apiPutCryptoDesk, getStaff, hasPermission, type CryptoDeskGates } from "@/lib/api";

function minorToUsdc(value: number) {
  if (!value) return "";
  const raw = (value / 1_000_000).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return raw.includes(".") && raw.split(".")[1].length < 2 ? Number(raw).toFixed(2) : raw;
}

function htg(minor: number) {
  if (!Number.isFinite(minor) || minor <= 0) return "—";
  const n = Math.trunc(minor);
  return `${Math.trunc(n / 100)}.${String(n % 100).padStart(2, "0")} HTG`;
}

function feeOf(fx: number, bps: number) {
  if (fx <= 0 || bps <= 0 || bps > 1000) return 0;
  return Math.floor((fx * bps) / 10000);
}

function QuoteLines({
  title,
  fx,
  bps,
  paying,
  fxLine,
  feeLine,
  totalLine,
}: {
  title: string;
  fx: number;
  bps: number;
  paying: boolean;
  fxLine: string;
  feeLine: string;
  totalLine: string;
}) {
  const fee = feeOf(fx, bps);
  const total = paying ? fx + fee : fx - fee;
  const ready = fx > 0 && fee > 0 && total > 0;
  return (
    <li className="space-y-1">
      <p className="font-medium text-[var(--text)]">{title}</p>
      {ready ? (
        <>
          <p>
            {fxLine}: {htg(fx)}
          </p>
          <p>
            {feeLine}: {htg(fee)}
          </p>
          <p>
            {totalLine}: {htg(total)}
          </p>
        </>
      ) : (
        <p>—</p>
      )}
    </li>
  );
}

export default function QuotesPage() {
  const t = useTranslations("quotes");
  const canRead = hasPermission(getStaff(), "users:read");
  const canWrite = hasPermission(getStaff(), "content:write");
  const [gates, setGates] = useState<CryptoDeskGates | null>(null);
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const filled = useRef(false);

  function paint(data: CryptoDeskGates, fillInput: boolean) {
    setGates(data);
    if (fillInput) {
      const bps = data.desk?.commissionBps ?? 0;
      setPercent(bps > 0 ? (bps / 100).toFixed(2) : "");
    }
  }

  useEffect(() => {
    if (!canRead) {
      setForbidden(true);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const data = await apiGetCryptoDesk();
        if (cancelled) return;
        paint(data, !filled.current);
        filled.current = true;
      } catch (e) {
        if (!cancelled) setNote((e as { code?: number }).code === 403 ? t("needContent") : t("loadError"));
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [canRead, t]);

  async function save() {
    if (!gates) return;
    setSaving(true);
    setNote(null);
    try {
      const data = await apiPutCryptoDesk({
        buyHtg: "",
        sellHtg: "",
        sendFeeUsdc: minorToUsdc(gates.desk?.sendFeeUsdcMinor ?? 0),
        ethBuyHtg: "",
        ethSellHtg: "",
        baseReady: Boolean(gates.desk?.baseReady),
        commissionPercent: percent.trim(),
      });
      paint(data, true);
      setNote(t("saved"));
    } catch (e) {
      setNote((e as { code?: number }).code === 403 ? t("needContent") : t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return <p className="text-sm text-[var(--text-muted)]">{t("needContent")}</p>;
  }

  const bps = gates?.desk?.commissionBps ?? 0;
  const pays = gates?.desk?.sellHtgMinor ?? 0;
  const receives = gates?.desk?.buyHtgMinor ?? 0;
  const ethPays = gates?.desk?.ethSellHtgMinor ?? 0;
  const ethReceives = gates?.desk?.ethBuyHtgMinor ?? 0;
  const rateOpen = pays > 0 && receives > 0;

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-medium">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("lead")}</p>
      </div>
      <ul className="space-y-1 text-sm text-[var(--text-muted)]">
        <li>
          {t("usdc")}: {t("usdcValue")}
        </li>
        <li>
          {t("eth")}: {gates?.ethUsd ? `${gates.ethUsd} USD` : t("ethMissing")}
          {gates?.ethAsOf ? ` · ${t("ethAsOf")} ${gates.ethAsOf}` : ""}
        </li>
        <li>{rateOpen ? `${t("pays")}: ${htg(pays)}` : t("rateClosed")}</li>
        {rateOpen ? (
          <li>
            {t("receives")}: {htg(receives)}
          </li>
        ) : null}
        <li>
          {t("savedCommission")}: {bps > 0 ? `${(bps / 100).toFixed(2)}%` : t("none")}
        </li>
      </ul>
      <div>
        <h2 className="text-sm font-medium">{t("live")}</h2>
        <ul className="mt-2 space-y-3 text-sm text-[var(--text-muted)]">
          <QuoteLines
            title={t("buyUsdc")}
            fx={pays}
            bps={bps}
            paying
            fxLine={t("fxLine")}
            feeLine={t("feeLine")}
            totalLine={t("totalLine")}
          />
          <QuoteLines
            title={t("sellUsdc")}
            fx={receives}
            bps={bps}
            paying={false}
            fxLine={t("fxLine")}
            feeLine={t("feeLine")}
            totalLine={t("totalLine")}
          />
          <QuoteLines
            title={t("buyEth")}
            fx={ethPays}
            bps={bps}
            paying
            fxLine={t("fxLine")}
            feeLine={t("feeLine")}
            totalLine={t("totalLine")}
          />
          <QuoteLines
            title={t("sellEth")}
            fx={ethReceives}
            bps={bps}
            paying={false}
            fxLine={t("fxLine")}
            feeLine={t("feeLine")}
            totalLine={t("totalLine")}
          />
        </ul>
      </div>
      <label className="block text-sm">
        {t("commission")}
        <input
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          disabled={!canWrite}
          inputMode="decimal"
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      {canWrite ? (
        <button
          type="button"
          onClick={save}
          disabled={saving || !gates}
          className="rounded border border-[var(--border)] px-4 py-2 text-sm"
        >
          {t("save")}
        </button>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t("needContent")}</p>
      )}
      {note ? <p className="text-sm text-[var(--text-muted)]">{note}</p> : null}
    </section>
  );
}
