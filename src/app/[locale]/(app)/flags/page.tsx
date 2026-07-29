"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

/** Legacy path → Configuración de la app */
export default function FlagsRedirectPage() {
  const locale = useLocale();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${locale}/config/flags`);
  }, [locale, router]);
  return null;
}
