"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiDisableUserCard,
  apiFreezeUserCard,
  apiIssueUserCard,
  apiListUserCards,
  apiSetCardFulfillment,
  type AdminUserCard,
} from "@/lib/api";
import { StatusChip } from "@/components/status-chip";

const FULFILLMENT = ["processing", "manufacturing", "shipping", "activation", "active"] as const;

function kindLabel(kind: string, t: (k: string) => string) {
  return kind === "physical" ? t("cards.kindPhysical") : t("cards.kindVirtual");
}

function statusLabel(status: string, t: (k: string) => string) {
  const key = `cards.status.${status}`;
  const v = t(key);
  return v === key ? status : v;
}

export function UserCardsPanel({
  userId,
  holderName,
  canWrite,
  t,
}: {
  userId: string;
  holderName?: string;
  canWrite: boolean;
  t: (k: string) => string;
}) {
  const [items, setItems] = useState<AdminUserCard[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await apiListUserCards(userId);
    setItems(data.items || []);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setError(t("cards.loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg("");
    setError("");
    try {
      await fn();
      await load();
      setMsg(ok);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("noPermissionAction"));
    } finally {
      setBusy(false);
    }
  }

  const hasLiveKind = (k: string) =>
    items.some((c) => c.kind === k && c.status !== "cancelled");
  const live = items.filter((c) => c.status !== "cancelled");
  const history = items.filter((c) => c.status === "cancelled");

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">{t("cards.pciNote")}</p>
      {canWrite ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || hasLiveKind("virtual")}
            className="rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
            onClick={() =>
              run(
                () => apiIssueUserCard(userId, "virtual", holderName),
                t("cards.issuedVirtual"),
              )
            }
          >
            {t("cards.issueVirtual")}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-50"
            onClick={() =>
              run(
                () => apiIssueUserCard(userId, "physical", holderName),
                t("cards.issuedPhysical"),
              )
            }
          >
            {hasLiveKind("physical") ? t("cards.issuePhysicalExisting") : t("cards.issuePhysical")}
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("cards.empty")}</p>
      ) : (
        <div className="space-y-4">
          {live.length === 0 && history.length > 0 ? (
            <p className="text-sm text-[var(--text-muted)]">{t("cards.historyOnly")}</p>
          ) : null}
          {[...live, ...history].map((card) => {
            const fulfillment = FULFILLMENT.includes(card.status as (typeof FULFILLMENT)[number]);
            const canLock = card.status === "active" || card.status === "frozen";
            return (
              <article
                key={card.id}
                className="space-y-3 rounded border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{kindLabel(card.kind, t)}</h3>
                    <p className="mt-1 font-mono-data text-sm">{card.maskedPan || "••••"}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      {card.holderName || "—"}
                      {card.expMonth && card.expYear
                        ? ` · ${String(card.expMonth).padStart(2, "0")}/${card.expYear}`
                        : ""}
                      {` · ${card.issuerLinked ? t("cards.issued") : t("cards.notIssued")}`}
                    </p>
                  </div>
                  <StatusChip status={card.status} label={statusLabel(card.status, t)} />
                </div>

                {canWrite && card.kind === "physical" && card.status !== "cancelled" ? (
                  <label className="block max-w-xs space-y-1 text-sm">
                    <span className="text-[var(--text-muted)]">{t("cards.fulfillment")}</span>
                    <select
                      disabled={busy || card.status === "frozen"}
                      value={fulfillment ? card.status : "processing"}
                      className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
                      onChange={(e) =>
                        run(
                          () => apiSetCardFulfillment(userId, card.id, e.target.value),
                          t("cards.fulfillmentUpdated"),
                        )
                      }
                    >
                      {FULFILLMENT.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s, t)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                {canWrite && card.status !== "cancelled" ? (
                  <div className="flex flex-wrap gap-2">
                    {canLock ? (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded border border-[var(--border)] px-3 py-1.5 text-xs"
                        onClick={() =>
                          run(
                            () => apiFreezeUserCard(userId, card.id, card.status !== "frozen"),
                            card.status === "frozen" ? t("cards.unfrozen") : t("cards.frozen"),
                          )
                        }
                      >
                        {card.status === "frozen" ? t("cards.unfreeze") : t("cards.freeze")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded border border-[var(--danger)] px-3 py-1.5 text-xs text-[var(--danger)]"
                      onClick={() => {
                        if (!window.confirm(t("cards.disableConfirm"))) return;
                        run(() => apiDisableUserCard(userId, card.id), t("cards.disabled"));
                      }}
                    >
                      {t("cards.disable")}
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
