"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  apiBootstrapAgentCore,
  apiListAgents,
  apiListUsers,
  apiPutCashConfig,
  apiRebalanceAgent,
  apiSetAgent,
  getStaff,
  hasPermission,
  type AgentHome,
  type AppUser,
} from "@/lib/api";

function htg(minor: number) {
  return (minor / 100).toLocaleString("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function toMinor(raw: string) {
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export default function AgentesPage() {
  const t = useTranslations("users.agent");
  const locale = useLocale();
  const canRead = hasPermission(getStaff(), "users:read");
  const canWrite = hasPermission(getStaff(), "users:update_status");
  const canFees = hasPermission(getStaff(), "flags:write");
  const [home, setHome] = useState<AgentHome | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<AppUser[]>([]);
  const [picked, setPicked] = useState<AppUser | null>(null);
  const [kind, setKind] = useState("agent");
  const [enabled, setEnabled] = useState(true);
  const [rebalanceId, setRebalanceId] = useState("");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [feeBps, setFeeBps] = useState("200");
  const [shareBps, setShareBps] = useState("7000");
  const [lowFloat, setLowFloat] = useState("500");

  async function load() {
    const data = await apiListAgents();
    setHome(data);
    setFeeBps(String(data.feeBps));
    setShareBps(String(data.agentShareBps));
    setLowFloat((data.lowFloatMinor / 100).toString());
    setRebalanceId((current) => {
      if (current && data.agents.some((a) => a.userId === current && a.floatSavingsId)) return current;
      return data.agents.find((a) => a.floatSavingsId)?.userId || "";
    });
  }

  useEffect(() => {
    if (!canRead) return;
    load().catch(() => setMsg(t("error")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead]);

  if (!canRead) return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;

  async function onSearch() {
    setBusy(true);
    setMsg("");
    try {
      const data = await apiListUsers(q.trim(), "", 0, 8);
      setFound(data.items || []);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveAgent(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || !picked) return;
    setBusy(true);
    setMsg("");
    try {
      await apiSetAgent(picked.id, kind, enabled);
      setPicked(null);
      setFound([]);
      setQ("");
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
      await load();
      setMsg(t("bootstrapped"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function onRebalance(e: FormEvent) {
    e.preventDefault();
    if (!canWrite || !rebalanceId) return;
    const minor = toMinor(amount);
    if (minor <= 0) return;
    const who = home?.agents.find((a) => a.userId === rebalanceId);
    const label = who?.displayName || who?.phone || rebalanceId;
    const verb = direction === "credit" ? t("credit") : t("debit");
    if (!window.confirm(`${verb}: ${htg(minor)} HTG — ${label}`)) return;
    setBusy(true);
    setMsg("");
    try {
      await apiRebalanceAgent(rebalanceId, direction, minor, note);
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
      await load();
      setMsg(t("feesSaved"));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : t("error"));
    } finally {
      setBusy(false);
    }
  }

  const agents = home?.agents || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{t("pageTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t("pageLead")}</p>
        </div>
        {canWrite ? (
          <button
            type="button"
            disabled={busy}
            onClick={onBootstrap}
            className="rounded border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
          >
            {t("bootstrap")}
          </button>
        ) : null}
      </div>

      {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}

      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">{t("colName")}</th>
              <th className="px-4 py-3">{t("colPhone")}</th>
              <th className="px-4 py-3">{t("kind")}</th>
              <th className="px-4 py-3">{t("float")}</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[var(--text-muted)]">
                  {t("emptyAgents")}
                </td>
              </tr>
            ) : (
              agents.map((a) => (
                <tr key={a.userId} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <Link href={`/${locale}/users/${a.userId}`} className="underline">
                      {a.displayName || a.userId}
                    </Link>
                    {!a.enabled ? <span className="ml-2 text-[var(--text-muted)]">{t("paused")}</span> : null}
                  </td>
                  <td className="px-4 py-3 font-mono-data text-xs">{a.phone}</td>
                  <td className="px-4 py-3">{t(`kinds.${a.kind === "partner" || a.kind === "till" ? a.kind : "agent"}`)}</td>
                  <td className="px-4 py-3">
                    {a.floatSavingsId ? `${htg(a.floatAvailableMinor)} HTG` : "—"}
                    {a.lowFloat ? <span className="ml-2 text-[var(--danger)]">{t("low")}</span> : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {canWrite ? (
        <div className="space-y-3 rounded border border-[var(--border)] p-4">
          <h2 className="text-sm font-semibold">{t("makeAgent")}</h2>
          <div className="flex flex-wrap gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void onSearch();
                }
              }}
              placeholder={t("search")}
              className="min-w-56 flex-1 rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSearch()}
              className="rounded border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-60"
            >
              {t("searchGo")}
            </button>
          </div>
          {found.length ? (
            <ul className="space-y-1 text-sm">
              {found.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(u)}
                    className={`rounded px-2 py-1 ${picked?.id === u.id ? "bg-[var(--accent)] text-[var(--accent-fg)]" : "hover:bg-[var(--surface)]"}`}
                  >
                    {u.displayName || u.id} · {u.phoneE164}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
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
            <div className="flex items-end">
              <button
                type="submit"
                disabled={busy || !picked}
                className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
              >
                {t("save")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {canWrite ? (
        <form onSubmit={onRebalance} className="grid gap-3 rounded border border-[var(--border)] p-4 sm:grid-cols-4">
          <h2 className="text-sm font-semibold sm:col-span-4">{t("rebalance")}</h2>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>{t("colName")}</span>
            <select
              value={rebalanceId}
              onChange={(e) => setRebalanceId(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            >
              {agents
                .filter((a) => a.floatSavingsId)
                .map((a) => (
                  <option key={a.userId} value={a.userId}>
                    {a.displayName || a.phone || a.userId}
                  </option>
                ))}
            </select>
          </label>
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
          <label className="space-y-1 text-sm sm:col-span-2">
            <span>{t("note")}</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || !rebalanceId}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {t("apply")}
            </button>
          </div>
        </form>
      ) : null}

      {canFees ? (
        <form onSubmit={onFees} className="grid gap-3 rounded border border-[var(--border)] p-4 sm:grid-cols-4">
          <h2 className="text-sm font-semibold sm:col-span-4">{t("fees")}</h2>
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

      <div>
        <h2 className="text-sm font-semibold">{t("history")}</h2>
        {home?.recent?.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {home.recent.map((op) => (
              <li key={op.id} className="font-mono-data text-[var(--text-muted)]">
                {op.direction} · {htg(op.amountMinor)} HTG · {op.status}
                {op.feeMinor ? ` · ${t("fees")} ${htg(op.feeMinor)}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--text-muted)]">{t("emptyOps")}</p>
        )}
      </div>
    </div>
  );
}
