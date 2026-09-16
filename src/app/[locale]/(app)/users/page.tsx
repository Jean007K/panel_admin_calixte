"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  apiDeleteUser,
  apiListUsers,
  getStaff,
  hasPermission,
  type AppUser,
} from "@/lib/api";
import { PAGE_SIZE, PaginationBar } from "@/components/pagination-bar";
import { StatusChip } from "@/components/status-chip";

const STATUSES = ["", "active", "pending", "locked", "suspended", "disabled", "closed"];
const ONBOARDING = ["", "missing", "partial", "linked"];

export default function UsersPage() {
  const t = useTranslations("users");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [onboarding, setOnboarding] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<AppUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<"forbidden" | "load" | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState("");
  const canRead = hasPermission(getStaff(), "users:read");
  const canDelete = hasPermission(getStaff(), "users:delete");

  useEffect(() => {
    if (!canRead) {
      setError("forbidden");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiListUsers(q, status, offset, PAGE_SIZE, onboarding);
        if (!cancelled) {
          setItems(data.items || []);
          setTotal(data.total);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as { code?: number }).code === 403 ? "forbidden" : "load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, status, onboarding, offset, canRead]);

  async function onDelete(u: AppUser) {
    if (!canDelete || u.onboarding !== "missing") return;
    if (!window.confirm(t("deleteConfirm"))) return;
    setBusyId(u.id);
    setFlash("");
    try {
      await apiDeleteUser(u.id);
      setItems((prev) => prev.filter((x) => x.id !== u.id));
      setTotal((n) => Math.max(0, n - 1));
      setFlash(t("deleteOk"));
    } catch (e) {
      const code = (e as { code?: number }).code;
      setFlash(code === 403 ? t("deleteForbidden") : t("deleteError"));
    } finally {
      setBusyId(null);
    }
  }

  if (error === "forbidden") {
    return <p className="text-sm text-[var(--danger)]">{t("forbidden")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{total} registros</p>
          {flash ? <p className="mt-1 text-sm text-[var(--accent)]">{flash}</p> : null}
        </div>
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
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            aria-label={t("status")}
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || t("allStatuses")}
              </option>
            ))}
          </select>
          <select
            value={onboarding}
            onChange={(e) => {
              setOnboarding(e.target.value);
              setOffset(0);
            }}
            className="rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
            aria-label={t("onboardingFilter")}
          >
            {ONBOARDING.map((s) => (
              <option key={s || "all-ob"} value={s}>
                {s === ""
                  ? t("allOnboarding")
                  : s === "missing"
                    ? t("onboardingMissing")
                    : s === "partial"
                      ? t("onboardingPartial")
                      : t("onboardingLinked")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">{t("columns.phone")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.name")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.status")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.onboarding")}</th>
              <th className="px-4 py-3 font-medium">{t("columns.updated")}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--text-muted)]">
                  {tc("loading")}
                </td>
              </tr>
            ) : error === "load" ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--danger)]">
                  {t("loadError")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--text-muted)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <tr
                  key={u.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/users/${u.id}`}
                      className="font-mono-data text-[var(--accent)] hover:underline"
                    >
                      {u.phoneE164}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{u.displayName || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusChip status={u.status} />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        u.onboarding === "linked"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : u.onboarding === "partial"
                            ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                            : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                      }`}
                    >
                      {u.onboarding === "linked"
                        ? t("onboardingLinked")
                        : u.onboarding === "partial"
                          ? t("onboardingPartial")
                          : t("onboardingMissing")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {u.updatedAt ? new Date(u.updatedAt).toLocaleString(locale) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDelete && u.onboarding === "missing" ? (
                      <button
                        type="button"
                        disabled={busyId === u.id}
                        onClick={() => onDelete(u)}
                        className="rounded border border-[var(--danger)] px-2 py-1 text-xs text-[var(--danger)] disabled:opacity-50"
                      >
                        {busyId === u.id ? "…" : t("delete")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PaginationBar total={total} limit={PAGE_SIZE} offset={offset} onPage={setOffset} />
    </div>
  );
}
