import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSTREAM = (process.env.BFF_ORIGIN || "https://api.bcalixte.cc.cd").replace(/\/$/, "");

async function proxy(req: NextRequest, path: string[]) {
  const dest = `${UPSTREAM}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  const headers = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  const origin = req.headers.get("origin");
  if (origin) headers.set("origin", origin);
  const referer = req.headers.get("referer");
  if (referer) headers.set("referer", referer);
  const corr = req.headers.get("x-correlation-id");
  if (corr) headers.set("x-correlation-id", corr);
  const fwd = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
  if (fwd) headers.set("x-forwarded-for", fwd);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
    cache: "no-store",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const upstream = await fetch(dest, init);
  const outHeaders = new Headers();
  const pass = ["content-type", "cache-control", "x-correlation-id", "retry-after"];
  for (const name of pass) {
    const v = upstream.headers.get(name);
    if (v) outHeaders.set(name, v);
  }
  outHeaders.set("cache-control", "no-store");

  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, { status: upstream.status, headers: outHeaders });
  const cookies =
    typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  for (const c of cookies) {
    res.headers.append("set-cookie", c);
  }
  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  if (!path?.length) {
    return NextResponse.json({ message: "not found" }, { status: 404 });
  }
  return proxy(req, path);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
