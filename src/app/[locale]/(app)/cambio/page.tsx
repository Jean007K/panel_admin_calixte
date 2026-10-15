"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiGetFx, apiPutFx, getStaff, hasPermission, type FxBoard } from "@/lib/api";

export default function FxPage() {
  const t = useTranslations("fx");
  const canRead = hasPermission(getStaff(), "users:read");
  const canWrite = hasPermission(getStaff(), "content:write");
  const [board, setBoard] = useState<FxBoard | null>(null);
  const [official, setOfficial] = useState("");
  const [sellAdd, setSellAdd] = useState("");
  const [buyCut, setBuyCut] = useState("");
  const [demandCap, setDemandCap] = useState("");
  const [demandFullUsd, setDemandFullUsd] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  function apply(data: FxBoard) {
    setBoard(data);
    setOfficial(data.official);
    setSellAdd(data.sellAdd);
    setBuyCut(data.buyCut);
    setDemandCap(data.demandCap === "0.00" ? "" : data.demandCap);
    setDemandFullUsd(data.demandFullUsd);
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
        official: official.trim(),
        sellAdd: sellAdd.trim(),
        buyCut: buyCut.trim(),
        demandCap: demandCap.trim(),
        demandFullUsd: demandFullUsd.trim(),
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
      {board ? (
        <ul className="space-y-1 text-sm text-[var(--text-muted)]">
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
        {t("official")}
        <input
          value={official}
          onChange={(e) => setOfficial(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        {t("sellAdd")}
        <input
          value={sellAdd}
          onChange={(e) => setSellAdd(e.target.value)}
          disabled={!canWrite}
          className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        {t("buyCut")}
        <input
          value={buyCut}
          onChange={(e) => setBuyCut(e.target.value)}
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
