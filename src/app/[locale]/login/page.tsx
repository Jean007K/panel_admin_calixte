"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { apiLogin } from "@/lib/api";
import { useTheme } from "@/components/theme-provider";

export default function LoginPage() {
  const t = useTranslations("login");
  const tt = useTranslations("topbar");
  const locale = useLocale();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const switchLocale = () => {
    const next = locale === "es" ? "fr" : "es";
    router.push(`/${next}/login`);
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await apiLogin(email.trim(), password);
      router.replace(`/${locale}/users`);
    } catch {
      setError(t("error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen bg-[var(--bg)]">
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          type="button"
          onClick={switchLocale}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium"
        >
          {locale === "es" ? "ES" : "FR"}
        </button>
        <button
          type="button"
          onClick={toggle}
          className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium"
        >
          {theme === "light" ? tt("themeDark") : tt("themeLight")}
        </button>
      </div>

      <div className="hidden w-[42%] flex-col justify-between border-r border-[var(--border)] bg-[var(--surface-2)] p-10 md:flex">
        <p className="font-display text-3xl tracking-tight text-[var(--text)]">Calixte</p>
        <div>
          <p className="font-display text-2xl leading-snug">{t("title")}</p>
          <p className="mt-3 max-w-sm text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
        </div>
        <p className="text-xs text-[var(--text-muted)]">panel.bcalixte.cc.cd</p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <div className="md:hidden">
            <p className="font-display text-2xl">Calixte</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">{t("subtitle")}</p>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("email")}</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("password")}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
          >
            {busy ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
