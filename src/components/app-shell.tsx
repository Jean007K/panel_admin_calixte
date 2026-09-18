"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./theme-provider";
import { apiLogout, apiMe, hasPermission, type Staff } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";

type NavLeaf = { href: string; labelKey: string; perm: string; match: string };

type NavGroup = {
  id: string;
  labelKey: string;
  children: NavLeaf[];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({ config: true, more: false });

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const s = await apiMe();
        if (live) setStaff(s);
      } catch {
        if (live) router.replace(`/${locale}/login`);
      }
    })();
    return () => {
      live = false;
    };
  }, [locale, router]);

  useEffect(() => {
    const idleMs = 15 * 60 * 1000;
    let timer = 0;
    const expire = async () => {
      await apiLogout();
      router.replace(`/${locale}/login`);
    };
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void expire();
      }, idleMs);
    };
    const evts: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll"];
    evts.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    bump();
    return () => {
      window.clearTimeout(timer);
      evts.forEach((e) => window.removeEventListener(e, bump));
    };
  }, [locale, router]);

  useEffect(() => {
    if (pathname.includes("/config")) setOpen((o) => ({ ...o, config: true }));
    if (
      pathname.includes("/links") ||
      pathname.includes("/devices") ||
      pathname.includes("/sessions") ||
      pathname.includes("/audit") ||
      pathname.includes("/ops") ||
      pathname.includes("/support") ||
      pathname.includes("/account-requests") ||
      pathname.includes("/config/simulaciones")
    ) {
      setOpen((o) => ({ ...o, more: true }));
    }
  }, [pathname]);

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

  const usersItem: NavLeaf = {
    href: `/${locale}/users`,
    labelKey: "nav.users",
    perm: "users:read",
    match: "/users",
  };

  const cardsItem: NavLeaf = {
    href: `/${locale}/cards`,
    labelKey: "nav.cards",
    perm: "users:read",
    match: "/cards",
  };

  const groups: NavGroup[] = [
    {
      id: "config",
      labelKey: "nav.config",
      children: [
        {
          href: `/${locale}/config/anuncios`,
          labelKey: "nav.configAds",
          perm: "content:read",
          match: "/config/anuncios",
        },
        {
          href: `/${locale}/config/prestamos`,
          labelKey: "nav.configLoans",
          perm: "loans:config",
          match: "/config/prestamos",
        },
        {
          href: `/${locale}/config/productos`,
          labelKey: "nav.configProducts",
          perm: "products:read",
          match: "/config/productos",
        },
        {
          href: `/${locale}/config/seguros`,
          labelKey: "nav.configInsurance",
          perm: "content:read",
          match: "/config/seguros",
        },
        {
          href: `/${locale}/config/actualizacion`,
          labelKey: "nav.configRemote",
          perm: "flags:read",
          match: "/config/actualizacion",
        },
        {
          href: `/${locale}/config/flags`,
          labelKey: "nav.configFlags",
          perm: "flags:read",
          match: "/config/flags",
        },
      ],
    },
    {
      id: "more",
      labelKey: "nav.more",
      children: [
        { href: `/${locale}/links`, labelKey: "nav.links", perm: "users:read", match: "/links" },
        {
          href: `/${locale}/devices`,
          labelKey: "nav.devices",
          perm: "devices:read",
          match: "/devices",
        },
        {
          href: `/${locale}/sessions`,
          labelKey: "nav.sessions",
          perm: "devices:read",
          match: "/sessions",
        },
        { href: `/${locale}/audit`, labelKey: "nav.audit", perm: "audit:read", match: "/audit" },
        { href: `/${locale}/ops`, labelKey: "nav.ops", perm: "ops:read", match: "/ops" },
        { href: `/${locale}/support`, labelKey: "nav.support", perm: "users:read", match: "/support" },
        {
          href: `/${locale}/account-requests`,
          labelKey: "nav.accountRequests",
          perm: "users:read",
          match: "/account-requests",
        },
        {
          href: `/${locale}/config/simulaciones`,
          labelKey: "nav.configSimulations",
          perm: "loans:simulations:read",
          match: "/config/simulaciones",
        },
      ],
    },
  ];

  const leafClass = (active: boolean, nested = false) =>
    [
      "block w-full rounded px-3 py-2 text-sm leading-snug",
      nested ? "pl-4 text-[13px]" : "",
      active
        ? "bg-[var(--accent)] font-medium text-[var(--accent-fg)]"
        : "text-[var(--text)] hover:bg-[var(--surface)]",
    ]
      .filter(Boolean)
      .join(" ");

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface-2)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="font-display text-xl tracking-tight">{t("app.name")}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{t("app.tagline")}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto p-3">
          {hasPermission(staff, usersItem.perm) ? (
            <Link
              href={usersItem.href}
              className={leafClass(pathname.includes(usersItem.match) && !pathname.includes("/cards"))}
            >
              {t(usersItem.labelKey)}
            </Link>
          ) : null}
          {hasPermission(staff, cardsItem.perm) ? (
            <Link
              href={cardsItem.href}
              className={leafClass(pathname.includes(cardsItem.match))}
            >
              {t(cardsItem.labelKey)}
            </Link>
          ) : null}

          {groups.map((g) => {
            const visible = g.children.filter((c) => hasPermission(staff, c.perm));
            if (visible.length === 0) return null;
            const groupActive = visible.some((c) => pathname.includes(c.match));
            return (
              <div key={g.id} className="mt-1 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [g.id]: !o[g.id] }))}
                  className={`flex w-full items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm font-medium ${
                    groupActive ? "text-[var(--text)]" : "text-[var(--text-muted)]"
                  } hover:bg-[var(--surface)]`}
                >
                  <span className="min-w-0 flex-1 break-words">{t(g.labelKey)}</span>
                  <span className="shrink-0 text-xs opacity-70">{open[g.id] ? "▾" : "▸"}</span>
                </button>
                {open[g.id] ? (
                  <div className="ml-1 flex flex-col gap-0.5 border-l border-[var(--border)] pl-1">
                    {visible.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className={leafClass(pathname.includes(c.match), true)}
                      >
                        <span className="block truncate" title={t(c.labelKey)}>
                          {t(c.labelKey)}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}

          <a
            href="https://mifos.bcalixte.cc.cd/"
            target="_blank"
            rel="noreferrer"
            className="mt-2 block w-full rounded px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
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
