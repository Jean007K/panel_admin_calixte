"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiListFlags, apiUpsertFlag, getStaff, hasPermission } from "@/lib/api";

type Flag = { key: string; enabled: boolean; value: unknown; updatedAt: string };

function asObj(v: unknown): Record<string, unknown> {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return {};
}

export function RemoteUpdateForm({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations("config.remote");
  const can = hasPermission(getStaff(), "flags:read");
  const canWrite =
    hasPermission(getStaff(), "flags:write") || hasPermission(getStaff(), "app_config:write");
  const [kill, setKill] = useState(false);
  const [forceEnabled, setForceEnabled] = useState(false);
  const [minVersion, setMinVersion] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [message, setMessage] = useState("");
  const [blockedText, setBlockedText] = useState("");
  const [blockedEnabled, setBlockedEnabled] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiListFlags();
      const items = data.items || [];
      const byKey = Object.fromEntries(items.map((f: Flag) => [f.key, f]));
      setKill(!!byKey.kill_switch?.enabled);
      const fu = byKey.force_update;
      setForceEnabled(!!fu?.enabled);
      const fv = asObj(fu?.value);
      setMinVersion(String(fv.minVersion || ""));
      setStoreUrl(String(fv.storeUrl || ""));
      setMessage(String(fv.message || ""));
      const bv = byKey.blocked_versions;
      setBlockedEnabled(!!bv?.enabled);
      const versions = asObj(bv?.value).versions;
      setBlockedText(Array.isArray(versions) ? versions.join("\n") : "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (can) void load();
  }, [can]);

  if (!can) {
    if (embedded) return null;
    return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    if (kill) {
      const typed = window.prompt(t("killConfirmPrompt"));
      if (typed !== t("killConfirmWord")) return;
    } else if (!window.confirm(t("saveConfirm"))) {
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const versions = blockedText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await apiUpsertFlag("kill_switch", kill, {});
      await apiUpsertFlag("force_update", forceEnabled, {
        minVersion,
        storeUrl,
        message,
      });
      await apiUpsertFlag("blocked_versions", blockedEnabled, { versions });
      setMsg(t("saved"));
      await load();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const Title = embedded ? "h2" : "h1";

  return (
    <div className={embedded ? "mt-10 max-w-xl space-y-4 border-t border-[var(--border)] pt-8" : "mx-auto max-w-xl space-y-4"}>
      <div>
        <Title className={embedded ? "text-lg font-semibold" : "font-display text-2xl tracking-tight"}>
          {t("title")}
        </Title>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">…</p>
      ) : (
        <form onSubmit={onSave} className="space-y-5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={kill}
              disabled={!canWrite}
              onChange={(e) => setKill(e.target.checked)}
            />
            {t("killSwitch")}
          </label>

          <fieldset className="space-y-3 border border-[var(--border)] p-4">
            <legend className="px-1 text-sm font-semibold">{t("forceUpdate")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceEnabled}
                disabled={!canWrite}
                onChange={(e) => setForceEnabled(e.target.checked)}
              />
              Enabled
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t("minVersion")}</span>
              <input
                value={minVersion}
                disabled={!canWrite}
                onChange={(e) => setMinVersion(e.target.value)}
                placeholder="1.2.0"
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t("storeUrl")}</span>
              <input
                value={storeUrl}
                disabled={!canWrite}
                onChange={(e) => setStoreUrl(e.target.value)}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t("message")}</span>
              <textarea
                value={message}
                disabled={!canWrite}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
              />
            </label>
          </fieldset>

          <fieldset className="space-y-3 border border-[var(--border)] p-4">
            <legend className="px-1 text-sm font-semibold">{t("blockedVersions")}</legend>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={blockedEnabled}
                disabled={!canWrite}
                onChange={(e) => setBlockedEnabled(e.target.checked)}
              />
              Enabled
            </label>
            <textarea
              value={blockedText}
              disabled={!canWrite}
              onChange={(e) => setBlockedText(e.target.value)}
              rows={4}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 font-mono-data text-xs"
              placeholder={"1.0.0\n1.1.0"}
            />
          </fieldset>

          {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}
          {canWrite ? (
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
            >
              {t("save")}
            </button>
          ) : null}
        </form>
      )}
    </div>
  );
}
