"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  apiDisableUserCard,
  apiFreezeUserCard,
  apiListAllCards,
  apiSetCardFulfillment,
  getStaff,
  hasPermission,
  type AdminDeskCard,
} from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";
import { StatusChip } from "@/components/status-chip";

const STATUSES = [
  "",
  "processing",
  "manufacturing",
  "shipping",
  "activation",
  "active",
  "frozen",
  "cancelled",
] as const;

const PIPELINE = ["processing", "manufacturing", "shipping", "activation", "active"] as const;

const NEXT: Record<string, string> = {
  processing: "manufacturing",
  manufacturing: "shipping",
  shipping: "activation",
  activation: "active",
};

function daysIn(iso?: string) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  const d = Math.max(0, Math.floor((Date.now() - t) / 86400000));
  return d === 0 ? "<1d" : `${d}d`;
}

export default function CardsDeskPage() {
  const t = useTranslations("cardsDesk");
  const tu = useTranslations("users.cards");
  const tc = useTranslations("common");
  const locale = useLocale();
  const staff = getStaff();
  const canRead = hasPermission(staff, "users:read");
  const canWrite = hasPermission(staff, "users:update_status");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AdminDeskCard[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"forbidden" | "load" | null>(null);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiListAllCards({ q, status, kind, offset });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setCounts(data.counts || {});
    } catch (e) {
      setError((e as { code?: number }).code === 403 ? "forbidden" : "load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canRead) {
      setError("forbidden");
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, kind, offset, canRead]);

  async function act(card: AdminDeskCard, fn: () => Promise<unknown>, ok: string) {
    setBusyId(card.id);
    setMsg("");
    try {
      await fn();
      await load();
      setMsg(ok);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : t("actionError"));
    } finally {
      setBusyId("");
    }
  }

  const kpis = useMemo(
    () => [
      { key: "all", label: t("kpi.total"), value: counts.all ?? 0 },
      { key: "active", label: t("kpi.inUse"), value: counts.active ?? 0 },
      { key: "frozen", label: t("kpi.frozen"), value: counts.frozen ?? 0 },
      { key: "cancelled", label: t("kpi.cancelled"), value: counts.cancelled ?? 0 },
      { key: "virtual", label: t("kpi.virtual"), value: counts.virtual ?? 0 },
      { key: "physical", label: t("kpi.physical"), value: counts.physical ?? 0 },
    ],
    [counts, t],
  );

  const pipeTotal = PIPELINE.reduce((acc, s) => acc + (counts[`physical_${s}`] ?? 0), 0);

  if (error === "forbidden") {
    return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-[var(--border)] px-3 py-2 text-sm hover:bg-[var(--surface-2)]"
        >
          {t("refresh")}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {kpis.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => {
              setOffset(0);
              if (k.key === "virtual" || k.key === "physical") {
                setKind(kind === k.key ? "" : k.key);
                setStatus("");
              } else if (k.key === "all") {
                setKind("");
                setStatus("");
              } else {
                setStatus(status === k.key ? "" : k.key);
              }
            }}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left hover:bg-[var(--surface-2)]"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{k.label}</p>
            <p className="mt-1 font-display text-2xl">{k.value}</p>
          </button>
        ))}
      </div>

      <section className="rounded border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">{t("pipeline")}</h2>
          <p className="text-xs text-[var(--text-muted)]">
            {pipeTotal} {t("physicalOpen")}
          </p>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {PIPELINE.map((s) => {
            const n = counts[`physical_${s}`] ?? 0;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setKind("physical");
                  setStatus(status === s ? "" : s);
                  setOffset(0);
                }}
                className="rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left"
              >
                <p className="text-xs text-[var(--text-muted)]">{tu(`status.${s}`)}</p>
                <p className="mt-1 text-lg font-semibold">{n}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOffset(0);
          }}
          placeholder={t("search")}
          className="min-w-[220px] rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setOffset(0);
          }}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          <option value="">{t("allKinds")}</option>
          <option value="virtual">{tu("kindVirtual")}</option>
          <option value="physical">{tu("kindPhysical")}</option>
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setOffset(0);
          }}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? tu(`status.${s}`) : tc("allStatuses")}
            </option>
          ))}
        </select>
      </div>

      {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}

      <div className="overflow-auto rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-3">{t("columns.client")}</th>
              <th className="px-3 py-3">{t("columns.kind")}</th>
              <th className="px-3 py-3">{t("columns.pan")}</th>
              <th className="px-3 py-3">{t("columns.status")}</th>
              <th className="px-3 py-3">{t("columns.requested")}</th>
              <th className="px-3 py-3">{t("columns.aging")}</th>
              <th className="px-3 py-3">{t("columns.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : error === "load" ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--danger)]">
                  {t("loadError")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((card) => {
                const next = NEXT[card.status];
                const canLock = card.status === "active" || card.status === "frozen";
                return (
                  <tr key={card.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]">
                    <td className="px-3 py-3">
                      <Link
                        href={`/${locale}/users/${card.userId}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        {card.displayName || card.phoneE164 || card.userId}
                      </Link>
                      <p className="font-mono-data text-xs text-[var(--text-muted)]">{card.phoneE164}</p>
                    </td>
                    <td className="px-3 py-3">
                      {card.kind === "physical" ? tu("kindPhysical") : tu("kindVirtual")}
                      {card.brand ? (
                        <span className="ml-1 uppercase text-xs text-[var(--text-muted)]">{card.brand}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-mono-data">{card.maskedPan || "••••"}</td>
                    <td className="px-3 py-3">
                      <StatusChip
                        status={card.status}
                        label={tu(`status.${card.status}` as "status.active")}
                      />
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">
                      {card.createdAt ? new Date(card.createdAt).toLocaleString(locale) : "—"}
                    </td>
                    <td className="px-3 py-3 text-[var(--text-muted)]">{daysIn(card.lastStatusAt)}</td>
                    <td className="px-3 py-3">
                      {canWrite && card.status !== "cancelled" ? (
                        <div className="flex flex-wrap gap-1">
                          {card.kind === "physical" && next ? (
                            <button
                              type="button"
                              disabled={busyId === card.id}
                              className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                              onClick={() =>
                                act(
                                  card,
                                  () => apiSetCardFulfillment(card.userId, card.id, next),
                                  t("advanced"),
                                )
                              }
                            >
                              {t("advance")}
                            </button>
                          ) : null}
                          {canLock ? (
                            <button
                              type="button"
                              disabled={busyId === card.id}
                              className="rounded border border-[var(--border)] px-2 py-1 text-xs"
                              onClick={() =>
                                act(
                                  card,
                                  () => apiFreezeUserCard(card.userId, card.id, card.status !== "frozen"),
                                  card.status === "frozen" ? tu("unfrozen") : tu("frozen"),
                                )
                              }
                            >
                              {card.status === "frozen" ? tu("unfreeze") : tu("freeze")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busyId === card.id}
                            className="rounded border border-[var(--danger)] px-2 py-1 text-xs text-[var(--danger)]"
                            onClick={() => {
                              if (!window.confirm(tu("disableConfirm"))) return;
                              act(card, () => apiDisableUserCard(card.userId, card.id), tu("disabled"));
                            }}
                          >
                            {tu("disable")}
                          </button>
                        </div>
                      ) : (
                        <Link
                          href={`/${locale}/users/${card.userId}`}
                          className="text-xs text-[var(--accent)] hover:underline"
                        >
                          {t("openClient")}
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar total={total} limit={PAGE_SIZE} offset={offset} onPage={setOffset} />
    </div>
  );
}
