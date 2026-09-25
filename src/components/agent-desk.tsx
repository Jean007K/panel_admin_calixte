"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  apiBootstrapAgentCore,
  apiGetAgent,
  apiGetCashConfig,
  apiPutCashConfig,
  apiRebalanceAgent,
  apiSetAgent,
  type AgentDeskView,
} from "@/lib/api";

function htg(minor: number) {
  return (minor / 100).toLocaleString("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toMinor(raw: string) {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function AgentDesk({
  userId,
  canWrite,
  canFees,
}: {
  userId: string;
  canWrite: boolean;
  canFees: boolean;
}) {
  const t = useTranslations("users.agent");
  const [view, setView] = useState<AgentDeskView | null>(null);
  const [kind, setKind] = useState("agent");
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [feeBps, setFeeBps] = useState("200");
  const [shareBps, setShareBps] = useState("7000");
  const [lowFloat, setLowFloat] = useState("500");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const desk = await apiGetAgent(userId);
    setView(desk);
    setKind(desk.kind || "agent");
    setEnabled(Boolean(desk.enabled));
    try {
      const cfg = await apiGetCashConfig();
      setFeeBps(String(cfg.feeBps));
      setShareBps(String(cfg.agentShareBps));
      setLowFloat((cfg.lowFloatMinor / 100).toString());
    } catch {
      /* staff without flags:read still manages the person */
    }
  }

  useEffect(() => {
    load().catch(() => setMsg(t("error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function onSaveAgent(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setBusy(true);
    setMsg("");
    try {
      await apiSetAgent(userId, kind, enabled);
      await load();
      setMsg(t("saved"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function onBootstrap() {
    if (!canWrite) return;
    setBusy(true);
    setMsg("");
    try {
      await apiBootstrapAgentCore();
      setMsg(t("bootstrapped"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function onRebalance(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    const minor = toMinor(amount);
    if (minor <= 0) return;
    setBusy(true);
    setMsg("");
    try {
      await apiRebalanceAgent(userId, direction, minor, note);
      setAmount("");
      setNote("");
      await load();
      setMsg(t("applied"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function onFees(e: FormEvent) {
    e.preventDefault();
    if (!canFees) return;
    setBusy(true);
    setMsg("");
    try {
      await apiPutCashConfig(Number(feeBps), Number(shareBps), toMinor(lowFloat));
      setMsg(t("feesSaved"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 space-y-6 rounded border border-[var(--border)] p-6">
      <div>
        <h2 className="text-sm font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("lead")}</p>
      </div>

      {view ? (
        <p className="text-sm">
          {t("float")}: {htg(view.floatAvailableMinor || 0)} {view.currency || "HTG"}
          {view.lowFloat ? ` — ${t("low")}` : ""}
        </p>
      ) : null}

      {canWrite ? (
        <form onSubmit={onSaveAgent} className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>{t("kind")}</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            >
              <option value="agent">{t("kinds.agent")}</option>
              <option value="partner">{t("kinds.partner")}</option>
              <option value="till">{t("kinds.till")}</option>
            </select>
          </label>
          <label className="flex items-end gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            {t("enabled")}
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {t("save")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onBootstrap}
              className="rounded border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
            >
              {t("bootstrap")}
            </button>
          </div>
        </form>
      ) : null}

      {canWrite && view?.floatSavingsId ? (
        <form onSubmit={onRebalance} className="grid gap-3 sm:grid-cols-4">
          <h3 className="sm:col-span-4 text-sm font-semibold">{t("rebalance")}</h3>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>{t("rebalance")}</span>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "credit" | "debit")}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            >
              <option value="credit">{t("credit")}</option>
              <option value="debit">{t("debit")}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>{t("amount")}</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{t("note")}</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60 sm:col-span-4 w-fit"
          >
            {t("apply")}
          </button>
        </form>
      ) : null}

      {canFees ? (
        <form onSubmit={onFees} className="grid gap-3 sm:grid-cols-4">
          <h3 className="sm:col-span-4 text-sm font-semibold">{t("fees")}</h3>
          <label className="space-y-1 text-sm">
            <span>{t("feeBps")}</span>
            <input
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{t("shareBps")}</span>
            <input
              value={shareBps}
              onChange={(e) => setShareBps(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>{t("lowFloat")}</span>
            <input
              value={lowFloat}
              onChange={(e) => setLowFloat(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {t("saveFees")}
            </button>
          </div>
        </form>
      ) : null}

      {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}

      <div>
        <h3 className="text-sm font-semibold">{t("recent")}</h3>
        {view?.recent?.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {view.recent.map((op) => (
              <li key={op.id} className="font-mono-data text-[var(--text-muted)]">
                {op.direction} · {htg(op.amountMinor)} HTG · {op.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{t("emptyOps")}</p>
        )}
      </div>
    </section>
  );
}
