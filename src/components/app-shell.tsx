"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./theme-provider";
import { apiLogout, getStaff, hasPermission, type Staff } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    const s = getStaff();
    if (!s) {
      router.replace(`/${locale}/login`);
      return;
    }
    setStaff(s);
  }, [locale, router]);

  const switchLocale = () => {
    const next = locale === "es" ? "fr" : "es";
    const rest = pathname.replace(/^\/(es|fr)/, "") || "";
    router.push(`/${next}${rest}`);
  };

  const onLogout = async () => {
    await apiLogout();
    router.replace(`/${locale}/login`);
  };

  if (!staff) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--text-muted)]">
        {t("common.loading")}
      </div>
    );
  }

  const canUsers = hasPermission(staff, "users:read");

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="font-display text-xl tracking-tight">{t("app.name")}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t("app.tagline")}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {canUsers && (
            <Link
              href={`/${locale}/users`}
              className={`rounded px-3 py-2 text-sm ${
                pathname.includes("/users")
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "hover:bg-[var(--surface)]"
              }`}
            >
              {t("nav.users")}
            </Link>
          )}
          <a
            href="https://mifos.bcalixte.cc.cd/"
            target="_blank"
            rel="noreferrer"
            className="rounded px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
          >
            {t("nav.mifos")} ↗
          </a>
        </nav>
        <div className="border-t border-[var(--border)] px-4 py-3 text-xs text-[var(--text-muted)]">
          <p className="font-medium text-[var(--text)]">{staff.displayName || staff.email}</p>
          <p className="mt-0.5 truncate">{staff.roles.join(", ")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5">
          <div />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={switchLocale}
              className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-2)]"
              aria-label={t("topbar.language")}
            >
              {locale === "es" ? "ES" : "FR"}
            </button>
            <button
              type="button"
              onClick={toggle}
              className="rounded border border-[var(--border)] px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-2)]"
              aria-label={theme === "light" ? t("topbar.themeDark") : t("topbar.themeLight")}
            >
              {theme === "light" ? t("topbar.themeDark") : t("topbar.themeLight")}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              {t("topbar.logout")}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
