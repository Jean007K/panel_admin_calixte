"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  apiGetUser,
  apiUpdateUserStatus,
  getStaff,
  hasPermission,
  type AppUser,
} from "@/lib/api";
import { StatusChip } from "@/components/status-chip";

const STATUSES = ["active", "pending", "locked", "suspended", "disabled", "closed"];

export default function UserDetailPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const canUpdate = hasPermission(getStaff(), "users:update_status");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = await apiGetUser(id);
        if (!cancelled) {
          setUser(u);
          setStatus(u.status);
          setReason(u.statusReason || "");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setMsg(t("reasonRequired"));
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      await apiUpdateUserStatus(id, status, reason.trim());
      const u = await apiGetUser(id);
      setUser(u);
      setMsg(t("statusUpdated"));
    } catch {
      setMsg(t("noPermissionAction"));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <p className="text-sm text-[var(--danger)]">{error}</p>;
  }
  if (!user) {
    return <p className="text-sm text-[var(--text-muted)]">{tc("loading")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href={`/${locale}/users`} className="text-sm text-[var(--accent)] hover:underline">
        ← {t("back")}
      </Link>
      <div>
        <h1 className="font-display text-2xl tracking-tight">{t("detail")}</h1>
        <p className="mt-1 font-mono-data text-sm text-[var(--text-muted)]">{user.id}</p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded border border-[var(--border)] bg-[var(--surface)] p-5 text-sm">
        <div>
          <dt className="text-[var(--text-muted)]">{t("columns.phone")}</dt>
          <dd className="mt-1 font-mono-data">{user.phoneE164}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">{t("columns.name")}</dt>
          <dd className="mt-1">{user.displayName || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">{t("columns.status")}</dt>
          <dd className="mt-1">
            <StatusChip status={user.status} />
          </dd>
        </div>
        <div>
          <dt className="text-[var(--text-muted)]">Email</dt>
          <dd className="mt-1">{user.email || "—"}</dd>
        </div>
      </dl>

      {canUpdate ? (
        <form
          onSubmit={onSave}
          className="space-y-4 rounded border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <h2 className="text-sm font-semibold">{t("changeStatus")}</h2>
          <label className="block space-y-1.5">
            <span className="text-sm">{t("columns.status")}</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm">{t("reason")}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </label>
          {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
          >
            {t("saveStatus")}
          </button>
        </form>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t("noPermissionAction")}</p>
      )}
    </div>
  );
}
