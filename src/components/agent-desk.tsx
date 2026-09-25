"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { apiGetAgent, type AgentDeskView } from "@/lib/api";

function htg(minor: number) {
  return (minor / 100).toLocaleString("fr-HT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AgentDesk({ userId }: { userId: string }) {
  const t = useTranslations("users.agent");
  const locale = useLocale();
  const [view, setView] = useState<AgentDeskView | null>(null);

  useEffect(() => {
    let live = true;
    apiGetAgent(userId)
      .then((desk) => {
        if (live) setView(desk);
      })
      .catch(() => {
        if (live) setView(null);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  const isAgent = Boolean(view?.enabled || view?.floatSavingsId);
  if (!isAgent || !view) return null;

  const kindKey = view.kind === "partner" || view.kind === "till" ? view.kind : "agent";

  return (
    <section className="mt-8 rounded border border-[var(--border)] px-4 py-3 text-sm">
      <p>
        {t(`kinds.${kindKey}`)}
        {view.enabled ? "" : ` · ${t("paused")}`}
        {" · "}
        {t("float")}: {htg(view.floatAvailableMinor || 0)} {view.currency || "HTG"}
        {view.lowFloat ? ` — ${t("low")}` : ""}
      </p>
      <Link href={`/${locale}/agentes`} className="mt-1 inline-block text-sm underline">
        {t("openDesk")}
      </Link>
    </section>
  );
}
