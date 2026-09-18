import createIntlMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

function hasAdminSession(req: NextRequest): boolean {
  return (
    req.cookies.has("__Host-calixte_rt") ||
    req.cookies.has("calixte_rt") ||
    req.cookies.has("__Host-calixte_at") ||
    req.cookies.has("calixte_at")
  );
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const locale = pathname.startsWith("/fr") ? "fr" : "es";
  const isLogin = /^\/(es|fr)\/login\/?$/.test(pathname);
  const session = hasAdminSession(req);

  if (!isLogin && !session && /^\/(es|fr)(\/|$)/.test(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isLogin && session) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/users`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return intl(req);
}

export const config = {
  matcher: ["/", "/(es|fr)/:path*"],
};
