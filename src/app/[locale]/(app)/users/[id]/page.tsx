"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import {
  apiDeleteUser,
  apiGetUserDossier,
  apiListUserNotifications,
  apiRevokeDevice,
  apiUpdateUserStatus,
  accountLast4Digits,
  getStaff,
  hasPermission,
  type UserDossier,
} from "@/lib/api";
import { AgentDesk } from "@/components/agent-desk";
import { StatusChip } from "@/components/status-chip";
import { UserCardsPanel } from "@/components/user-cards-panel";

const STATUSES = ["active", "pending", "locked", "suspended", "disabled", "closed"];

type TabId =
  | "summary"
  | "cards"
  | "links"
  | "devices"
  | "sessions"
  | "audit"
  | "transfers"
  | "notifications";

function str(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

function fmtDate(v: unknown, locale: string): string {
  if (!v || typeof v !== "string") return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(locale);
}

function OnboardingBadge({ value, t }: { value?: string; t: (k: string) => string }) {
  const label =
    value === "linked"
      ? t("onboardingLinked")
      : value === "partial"
        ? t("onboardingPartial")
        : t("onboardingMissing");
  const tone =
    value === "linked"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : value === "partial"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-[var(--surface-2)] text-[var(--text-muted)]";
  return (
    <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${tone}`}>{label}</span>
  );
}

export default function UserDetailPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const locale = useLocale();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [dossier, setDossier] = useState<UserDossier | null>(null);
  const [error, setError] = useState<"forbidden" | "load" | "not_found" | null>(null);
  const [tab, setTab] = useState<TabId>("summary");
  const [status, setStatus] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const canUpdate = hasPermission(getStaff(), "users:update_status");
  const canFees = hasPermission(getStaff(), "flags:write");
  const canRead = hasPermission(getStaff(), "users:read");
  const canRevokeDevice = hasPermission(getStaff(), "devices:revoke");
  const canDelete = hasPermission(getStaff(), "users:delete");
  const routerLocale = locale;

  const load = async () => {
    const d = await apiGetUserDossier(id);
    setDossier(d);
    setStatus(d.user.status);
    setReason(d.user.statusReason || "");
  };

  useEffect(() => {
    if (!canRead) {
      setError("forbidden");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (cancelled) return;
        const code = (e as { code?: number }).code;
        setError(code === 403 ? "forbidden" : code === 404 ? "not_found" : "load");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canRead]);

  async function onDeleteUser() {
    const ob = dossier?.onboarding || dossier?.user.onboarding;
    if (!canDelete || ob !== "missing") return;
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusy(true);
    setMsg("");
    try {
      await apiDeleteUser(id);
      window.location.href = `/${routerLocale}/users`;
    } catch (e) {
      const code = (e as { code?: number }).code;
      setMsg(code === 403 ? t("deleteForbidden") : t("deleteError"));
      setBusy(false);
    }
  }

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
      await load();
      setMsg(t("statusUpdated"));
    } catch {
      setMsg(t("noPermissionAction"));
    } finally {
      setBusy(false);
    }
  }

  const tabs = useMemo(
    () =>
      [
        { id: "summary" as const, label: t("tabs.summary") },
        { id: "cards" as const, label: t("tabs.cards") },
        { id: "links" as const, label: t("tabs.links") },
        { id: "devices" as const, label: t("tabs.devices") },
        { id: "sessions" as const, label: t("tabs.sessions") },
        { id: "audit" as const, label: t("tabs.audit") },
        { id: "transfers" as const, label: t("tabs.transfers") },
        { id: "notifications" as const, label: t("tabs.notifications") },
      ] as const,
    [t],
  );

  if (error === "forbidden") {
    return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;
  }
  if (error === "not_found") {
    return <p className="text-sm text-[var(--danger)]">{t("notFound")}</p>;
  }
  if (error === "load") {
    return <p className="text-sm text-[var(--danger)]">{t("dossierLoadError")}</p>;
  }
  if (!dossier) {
    return <p className="text-sm text-[var(--text-muted)]">{tc("loading")}</p>;
  }

  const user = dossier.user;
  const name = user.displayName || user.phoneE164;
  const mifosUrl = dossier.clientExternalId
    ? `https://mifos.bcalixte.cc.cd/#/clients/${dossier.clientExternalId}`
    : null;

  return (
    <div className="mx-auto max-w-6xl space-y-0">
      <div className="sticky top-0 z-10 -mx-6 border-b border-[var(--border)] bg-[var(--bg)] px-6 pb-3 pt-1">
        <Link href={`/${locale}/users`} className="text-sm text-[var(--accent)] hover:underline">
          ← {t("back")}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl tracking-tight">{name}</h1>
              <StatusChip status={user.status} />
              <OnboardingBadge value={dossier.onboarding || user.onboarding} t={t} />
            </div>
            <p className="font-mono-data text-sm text-[var(--text-muted)]">
              {user.phoneE164}
              {accountLast4Digits(user.accountLast4)
                ? ` · ****${accountLast4Digits(user.accountLast4)}`
                : ""}
              {user.lastLoginAt
                ? ` · ${t("lastLogin")}: ${fmtDate(user.lastLoginAt, locale)}`
                : ""}
            </p>
            <p className="font-mono-data text-xs text-[var(--text-muted)]">{user.id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mifosUrl ? (
              <a
                href={mifosUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-[var(--border)] px-3 py-1.5 text-sm hover:bg-[var(--surface)]"
              >
                {t("openMifos")} ↗
              </a>
            ) : null}
            {canDelete && (dossier.onboarding || user.onboarding) === "missing" ? (
              <button
                type="button"
                disabled={busy}
                onClick={onDeleteUser}
                className="rounded border border-[var(--danger)] px-3 py-1.5 text-sm text-[var(--danger)] disabled:opacity-50"
              >
                {t("delete")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-[var(--border)]">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={`shrink-0 border-b-2 px-3 py-2 text-sm ${
                tab === tb.id
                  ? "border-[var(--accent)] font-medium text-[var(--text)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5">
        {tab === "summary" ? (
          <>
          <div className="grid gap-6 lg:grid-cols-2">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">{t("columns.phone")}</dt>
                <dd className="mt-1 font-mono-data">{user.phoneE164}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("columns.name")}</dt>
                <dd className="mt-1">{user.displayName || "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Email</dt>
                <dd className="mt-1">{user.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("columns.onboarding")}</dt>
                <dd className="mt-1">
                  <OnboardingBadge value={dossier.onboarding} t={t} />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("lastLogin")}</dt>
                <dd className="mt-1">{fmtDate(user.lastLoginAt, locale)}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">{t("columns.updated")}</dt>
                <dd className="mt-1">{fmtDate(user.updatedAt, locale)}</dd>
              </div>
            </dl>

            {canUpdate ? (
              <form onSubmit={onSave} className="space-y-4 border-l border-[var(--border)] pl-6">
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
          <AgentDesk userId={id} canWrite={canUpdate} canFees={canFees} />
          </>
        ) : null}

        {tab === "cards" ? (
          <UserCardsPanel
            userId={id}
            holderName={user.displayName}
            canWrite={canUpdate}
            t={t}
          />
        ) : null}

        {tab === "links" ? (
          <DataTable
            empty={t("emptyLinks")}
            columns={[
              { key: "systemCode", label: "System" },
              { key: "resourceType", label: "Resource" },
              { key: "externalId", label: "External ID" },
              { key: "status", label: t("columns.status") },
              { key: "updatedAt", label: t("columns.updated"), date: true },
            ]}
            rows={dossier.links}
            locale={locale}
          />
        ) : null}

        {tab === "devices" ? (
          <div className="space-y-3">
            {msg ? <p className="text-sm text-[var(--text-muted)]">{msg}</p> : null}
            <DeviceDossierList
              devices={dossier.devices}
              sessions={[...(dossier.sessionsActive || []), ...(dossier.sessionsHistory || [])]}
              locale={locale}
              t={t}
              busy={busy}
              canRevoke={canRevokeDevice}
              onRevoke={async (deviceId) => {
                if (!window.confirm(t("revokeDeviceConfirm"))) return;
                setBusy(true);
                setMsg("");
                try {
                  await apiRevokeDevice(deviceId, "admin user dossier");
                  await load();
                  setMsg(t("deviceRevoked"));
                } catch {
                  setMsg(t("noPermissionAction"));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </div>
        ) : null}

        {tab === "sessions" ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 text-sm font-semibold">{t("sessionsActive")}</h3>
              <DataTable
                empty={t("emptySessions")}
                columns={[
                  { key: "status", label: t("columns.status") },
                  { key: "deviceId", label: "Device" },
                  { key: "lastIp", label: "IP" },
                  { key: "startedAt", label: "Started", date: true },
                  { key: "expiresAt", label: "Expires", date: true },
                ]}
                rows={dossier.sessionsActive}
                locale={locale}
              />
            </section>
            <section>
              <h3 className="mb-2 text-sm font-semibold">{t("sessionsHistory")}</h3>
              <DataTable
                empty={t("emptySessions")}
                columns={[
                  { key: "status", label: t("columns.status") },
                  { key: "deviceId", label: "Device" },
                  { key: "lastIp", label: "IP" },
                  { key: "startedAt", label: "Started", date: true },
                  { key: "lastSeenAt", label: "Last seen", date: true },
                ]}
                rows={dossier.sessionsHistory}
                locale={locale}
              />
            </section>
          </div>
        ) : null}

        {tab === "audit" ? (
          <DataTable
            empty={t("emptyAudit")}
            columns={[
              { key: "action", label: "Action" },
              { key: "actorId", label: "Actor" },
              { key: "resource", label: "Resource" },
              { key: "correlationId", label: "Correlation" },
              { key: "occurredAt", label: "When", date: true },
            ]}
            rows={dossier.audit}
            locale={locale}
          />
        ) : null}

        {tab === "notifications" ? <UserNotifications userId={id} /> : null}

        {tab === "transfers" ? (
          <DataTable
            empty={t("emptyTransfers")}
            columns={[
              { key: "id", label: "Job" },
              { key: "status", label: t("columns.status") },
              { key: "amountMinor", label: "Amount" },
              { key: "currency", label: "CCY" },
              { key: "createdAt", label: "Created", date: true },
              { key: "updatedAt", label: t("columns.updated"), date: true },
            ]}
            rows={dossier.transfers}
            locale={locale}
          />
        ) : null}
      </div>
    </div>
  );
}

function UserNotifications({ userId }: { userId: string }) {
  const t = useTranslations("notifications");
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    apiListUserNotifications(userId)
      .then((data) => {
        if (!live) return;
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [userId]);

  if (loading) return <p className="text-sm text-[var(--text-muted)]">{t("loading")}</p>;
  if (!items.length) return <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--text-muted)]">{t("total", { count: total })}</p>
      <div className="overflow-x-auto border border-[var(--border)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2">{t("type")}</th>
              <th className="px-3 py-2">{t("title")}</th>
              <th className="px-3 py-2">{t("body")}</th>
              <th className="px-3 py-2">{t("date")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((n) => (
              <tr key={String(n.id)} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono-data text-xs">{String(n.eventType || n.category || "")}</td>
                <td className="px-3 py-2">{String(n.title || "")}</td>
                <td className="px-3 py-2 text-[var(--text-muted)]">{String(n.body || "")}</td>
                <td className="px-3 py-2 text-xs">{String(n.createdAt || "")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeviceDossierList({
  devices,
  sessions,
  locale,
  t,
  busy,
  canRevoke,
  onRevoke,
}: {
  devices: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  locale: string;
  t: (k: string) => string;
  busy: boolean;
  canRevoke: boolean;
  onRevoke: (id: string) => Promise<void>;
}) {
  if (!devices.length) {
    return <p className="text-sm text-[var(--text-muted)]">{t("emptyDevices")}</p>;
  }
  return (
    <div className="space-y-4">
      {devices.map((r) => {
        const id = str(r.id);
        const model = str(r.deviceModel) !== "—" ? str(r.deviceModel) : str(r.platform);
        const os = str(r.osVersion);
        const app = str(r.appVersion);
        const ip = str(r.lastIp);
        const country = str(r.lastCountry);
        const related = sessions.filter((s) => str(s.deviceId) === id);
        return (
          <article
            key={id}
            className="rounded border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-medium">{model}</h3>
                  <StatusChip status={str(r.status)} />
                </div>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  {[
                    os !== "—" ? os : null,
                    app !== "—" ? `app ${app}` : null,
                    str(r.platform) !== "—" ? str(r.platform) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {canRevoke && r.status === "active" ? (
                <button
                  type="button"
                  className="text-xs text-[var(--danger)] hover:underline"
                  disabled={busy}
                  onClick={() => void onRevoke(id)}
                >
                  {t("revokeDevice")}
                </button>
              ) : null}
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs text-[var(--text-muted)]">{t("deviceIp")}</dt>
                <dd className="mt-0.5 font-mono-data text-xs">
                  {ip}
                  {country !== "—" ? ` · ${country}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)]">{t("deviceFirstSeen")}</dt>
                <dd className="mt-0.5">{fmtDate(r.firstSeenAt, locale)}</dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--text-muted)]">{t("deviceLastSeen")}</dt>
                <dd className="mt-0.5">{fmtDate(r.lastSeenAt, locale)}</dd>
              </div>
              {r.revokedAt ? (
                <div>
                  <dt className="text-xs text-[var(--text-muted)]">{t("deviceRevokedAt")}</dt>
                  <dd className="mt-0.5">{fmtDate(r.revokedAt, locale)}</dd>
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--text-muted)]">{t("deviceInstallation")}</dt>
                <dd className="mt-0.5 break-all font-mono-data text-xs">{str(r.installationId)}</dd>
              </div>
            </dl>
            {related.length > 0 ? (
              <div className="mt-4 border-t border-[var(--border)] pt-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  {t("deviceSessions")}
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[var(--text-muted)]">
                      <tr>
                        <th className="py-1 pr-3 font-medium">{t("columns.status")}</th>
                        <th className="py-1 pr-3 font-medium">{t("deviceAuthMethod")}</th>
                        <th className="py-1 pr-3 font-medium">{t("deviceIp")}</th>
                        <th className="py-1 pr-3 font-medium">{t("deviceStarted")}</th>
                        <th className="py-1 font-medium">{t("deviceLastSeen")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {related.map((s) => (
                        <tr key={str(s.id)} className="border-t border-[var(--border)]">
                          <td className="py-1.5 pr-3">
                            <StatusChip status={str(s.status)} />
                          </td>
                          <td className="py-1.5 pr-3">{str(s.authMethod)}</td>
                          <td className="py-1.5 pr-3 font-mono-data">{str(s.lastIp)}</td>
                          <td className="py-1.5 pr-3">{fmtDate(s.startedAt, locale)}</td>
                          <td className="py-1.5">{fmtDate(s.lastSeenAt, locale)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function DataTable({
  columns,
  rows,
  empty,
  locale,
}: {
  columns: { key: string; label: string; date?: boolean }[];
  rows: Record<string, unknown>[];
  empty: string;
  locale: string;
}) {
  if (!rows?.length) {
    return <p className="text-sm text-[var(--text-muted)]">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto border border-[var(--border)]">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={str(r.id) !== "—" ? str(r.id) : i} className="border-t border-[var(--border)]">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 font-mono-data text-xs">
                  {c.date ? fmtDate(r[c.key], locale) : str(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
