"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGetFx, apiPutFx, getStaff, hasPermission, type FxBoard } from "@/lib/api";

export default function FxPage() {
  const t = useTranslations("fx");
  const canRead = hasPermission(getStaff(), "users:read");
  const canWrite = hasPermission(getStaff(), "content:write");
  const [board, setBoard] = useState<FxBoard | null>(null);
  const [feed, setFeed] = useState("open");
  const [sellMargin, setSellMargin] = useState("");
  const [buyMargin, setBuyMargin] = useState("");
  const [demandCap, setDemandCap] = useState("");
  const [demandFullUsd, setDemandFullUsd] = useState("");
  const [pinned, setPinned] = useState(false);
  const [pinnedPays, setPinnedPays] = useState("");
  const [pinnedReceives, setPinnedReceives] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  function apply(data: FxBoard) {
    setBoard(data);
    setFeed(data.feed || "open");
    setSellMargin(data.sellMargin === "0.00" ? "" : data.sellMargin);
    setBuyMargin(data.buyMargin === "0.00" ? "" : data.buyMargin);
    setDemandCap(data.demandCap === "0.00" ? "" : data.demandCap);
    setDemandFullUsd(data.demandFullUsd);
    setPinned(data.pinned);
    setPinnedPays(data.pinnedPays);
    setPinnedReceives(data.pinnedReceives);
  }

  useEffect(() => {
    if (!canRead) {
      setForbidden(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGetFx();
        if (!cancelled) apply(data);
      } catch (e) {
        if (!cancelled) setNote((e as { code?: number }).code === 403 ? t("needContent") : t("loadError"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canRead, t]);

  async function save() {
    setSaving(true);
    setNote(null);
    try {
      const data = await apiPutFx({
        feed,
        sellMargin: sellMargin.trim(),
        buyMargin: buyMargin.trim(),
        demandCap: demandCap.trim(),
        demandFullUsd: demandFullUsd.trim(),
        pinned,
        pinnedPays: pinnedPays.trim(),
        pinnedReceives: pinnedReceives.trim(),
      });
      apply(data);
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

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-xl font-medium">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("lead")}</p>
      </div>
      <label className="block text-sm">
        {t("feed")}
        <select
          value={feed}
          onChange={(e) => setFeed(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        >
          {(board?.feeds?.length ? board.feeds : ["open", "xe"]).map((id) => (
            <option key={id} value={id}>
              {id === "open" ? t("feedOpen") : id === "xe" ? t("feedXe") : id}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-[var(--text-muted)]">{t("feedHelp")}</p>
      {board ? (
        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
          <li>
            {board.referenceLive ? t("sourceLive") : t("sourceDown")}
            {board.reference ? ` · ${board.reference}` : ""}
          </li>
          <li>{board.open ? t("boardOpen") : t("boardClosed")}</li>
          <li>
            {t("pays")}: {board.clientPays || "—"}
          </li>
          <li>
            {t("receives")}: {board.clientReceives || "—"}
          </li>
          <li>
            {t("demandNow")}: {board.demand}%
          </li>
        </ul>
      ) : null}
      <label className="block text-sm">
        {t("sellMargin")}
        <input
          value={sellMargin}
          onChange={(e) => setSellMargin(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        {t("buyMargin")}
        <input
          value={buyMargin}
          onChange={(e) => setBuyMargin(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        {t("demandCap")}
        <input
          value={demandCap}
          onChange={(e) => setDemandCap(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        {t("demandFull")}
        <input
          value={demandFullUsd}
          onChange={(e) => setDemandFullUsd(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={pinned} disabled={!canWrite} onChange={(e) => setPinned(e.target.checked)} />
        {t("pin")}
      </label>
      <label className="block text-sm">
        {t("pinnedPays")}
        <input
          value={pinnedPays}
          onChange={(e) => setPinnedPays(e.target.value)}
          disabled={!canWrite || !pinned}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        {t("pinnedReceives")}
        <input
          value={pinnedReceives}
          onChange={(e) => setPinnedReceives(e.target.value)}
          disabled={!canWrite || !pinned}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      {canWrite ? (
        <button
          type="button"
          onClick={save}
          disabled={saving}
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
