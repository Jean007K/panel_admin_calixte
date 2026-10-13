"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiGetCryptoBalances, type AdminCryptoLink, type USDCBalance } from "@/lib/api";

function statusLabel(status: string | undefined, t: (k: string) => string) {
  if (status === "active") return t("statusActive");
  if (status === "disabled") return t("statusDisabled");
  if (status === "pending") return t("statusPending");
  return status || "—";
}

export function UserCryptoPanel({ userId, crypto }: { userId: string; crypto?: AdminCryptoLink }) {
  const t = useTranslations("users.crypto");
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  const [balances, setBalances] = useState<USDCBalance[] | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const address = crypto?.walletAddress || "";

  useEffect(() => {
    if (!crypto?.linked || !address) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetCryptoBalances(userId);
        if (!cancelled) setBalances(data.balances || []);
      } catch {
        if (!cancelled) setBalanceError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, crypto?.linked, address]);

  if (!crypto?.linked) {
    return <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>;
  }
  if (!address) {
    return <p className="text-sm text-[var(--text-muted)]">{t("pendingAddress")}</p>;
  }

  const failed = balanceError || (balances != null && balances.length > 0 && balances.every((b) => !b.ok));

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="sm:col-span-2">
          <dt className="text-[var(--text-muted)]">{t("address")}</dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className="font-mono-data text-xs">{address}</span>
            <button
              type="button"
              className="rounded border border-[var(--border)] px-2 py-1 text-xs"
              onClick={() => {
                void navigator.clipboard.writeText(address).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                });
              }}
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">{t("chain")}</dt>
          <dd className="mt-1">{crypto.chain || "EVM"}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">{t("status")}</dt>
          <dd className="mt-1">{statusLabel(crypto.pilotStatus, t)}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">{t("dynamicId")}</dt>
          <dd className="mt-1 font-mono-data text-xs">{crypto.dynamicUserId || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">{t("created")}</dt>
          <dd className="mt-1">{crypto.createdAt ? new Date(crypto.createdAt).toLocaleString(locale) : "—"}</dd>
        </div>
      </dl>
      <section>
        <h2 className="text-sm font-semibold">{t("usdc")}</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{t("usdcHint")}</p>
        {failed ? <p className="mt-3 text-sm text-[var(--text-muted)]">{t("usdcFail")}</p> : null}
        {balances == null && !balanceError ? (
          <p className="mt-3 text-sm text-[var(--text-muted)]">…</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(balances || []).map((b) => (
              <li key={b.chainId} className="flex items-baseline justify-between gap-4 text-sm">
                <span>{b.network}</span>
                <span className="font-mono-data">{b.ok ? `${b.amount} ${b.symbol}` : b.error || t("usdcFail")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
