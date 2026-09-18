export const API_BASE = "";

export type Staff = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

export function accountLast4Digits(raw?: string): string {
  const d = (raw ?? "").replace(/\D/g, "");
  return d.slice(-4);
}

export type AppUser = {
  id: string;
  phoneE164: string;
  email?: string;
  displayName?: string;
  status: string;
  statusReason?: string;
  accountLast4?: string;
  lastLoginAt?: string;
  activatedAt?: string;
  suspendedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  hasClientLink?: boolean;
  hasSavingsLink?: boolean;
  onboarding?: "linked" | "partial" | "missing" | string;
};

export type UserDossier = {
  user: AppUser;
  onboarding: string;
  clientExternalId?: string;
  links: Record<string, unknown>[];
  devices: Record<string, unknown>[];
  sessionsActive: Record<string, unknown>[];
  sessionsHistory: Record<string, unknown>[];
  audit: Record<string, unknown>[];
  transfers: Record<string, unknown>[];
};

export type PromoAdmin = {
  id: string;
  tag: string;
  title: string;
  excerpt: string;
  cta: string;
  ctaLabel: string;
  featured: boolean;
  sortOrder: number;
  enabled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  locale: string;
  updatedAt: string;
};

export type ProductDefAdmin = {
  id: string;
  code: string;
  name: string;
  kind: string;
  currency: string;
  fineractProductId?: number | null;
  iconKey: string;
  sortOrder: number;
};

export type LoanTipConfig = {
  id?: string;
  title: string;
  heroRateLabel: string;
  heroRateCaption: string;
  maxAmountLabel: string;
  maxTermLabel: string;
  sectionTitle: string;
  interestMeta: string;
  disclaimer: string;
  rateBps: number;
  minMonths: number;
  maxMonths: number;
  maxAmountMinor: number;
  minAmountMinor: number;
  tipRatesDisplay?: Record<string, unknown>[];
};

export type LoanSimulationAdmin = {
  id: string;
  userId: string;
  phone: string;
  amountMinor: number;
  months: number;
  rateBps: number;
  paymentMinor: number;
  createdAt: string;
};

export type InsuranceProductAdmin = {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  interestLabel: string;
  iconKey: string;
  active: boolean;
  sortOrder: number;
};

const ACCESS_KEY = "calixte_admin_access";
const REFRESH_KEY = "calixte_admin_refresh";
const STAFF_KEY = "calixte_admin_staff";

let staffCache: Staff | null = null;

function wipeLegacyStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STAFF_KEY);
}

export function getStaff(): Staff | null {
  return staffCache;
}

export function setStaffCache(staff: Staff | null) {
  staffCache = staff;
}

export function setSession(_access: string, _refresh: string, staff: Staff) {
  staffCache = staff;
}

export function clearSession() {
  staffCache = null;
  wipeLegacyStorage();
}

export function hasPermission(staff: Staff | null, code: string): boolean {
  if (!staff) return false;
  if (staff.roles?.includes("super_admin")) return true;
  return staff.permissions?.includes(code) ?? false;
}

type ApiError = { code?: string; message?: string };

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiError;
    return body.message || res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function apiLogin(email: string, password: string) {
  wipeLegacyStorage();
  const res = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    cache: "no-store",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  setStaffCache(data.staff);
  return data.staff as Staff;
}

export async function apiLogout() {
  try {
    await fetch(`${API_BASE}/api/v1/admin/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: "{}",
    });
  } finally {
    clearSession();
  }
}

export async function apiMe() {
  const res = await authFetch("/api/v1/admin/me");
  if (!res.ok) throw Object.assign(new Error("unauthorized"), { code: res.status });
  const staff = (await res.json()) as Staff;
  setStaffCache(staff);
  return staff;
}

async function authFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const opts: RequestInit = { ...init, headers, credentials: "include", cache: "no-store" };
  let res = await fetch(`${API_BASE}${path}`, opts);
  if (res.status === 401 && !path.includes("/admin/auth/")) {
    const r = await fetch(`${API_BASE}/api/v1/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: "{}",
    });
    if (!r.ok) {
      clearSession();
      throw new Error("unauthorized");
    }
    const data = await r.json().catch(() => ({}));
    if (data.staff) setStaffCache(data.staff as Staff);
    res = await fetch(`${API_BASE}${path}`, opts);
  }
  return res;
}

export async function apiListUsers(
  q: string,
  status: string,
  offset = 0,
  limit = 50,
  onboarding = "",
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (onboarding) params.set("onboarding", onboarding);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await authFetch(`/api/v1/admin/users?${params}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: AppUser[]; total: number; limit: number; offset: number }>;
}

export async function apiDeleteUser(id: string) {
  const res = await authFetch(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (res.status === 404) throw Object.assign(new Error("not_found"), { code: 404 });
  if (res.status === 409) throw Object.assign(new Error(await parseError(res)), { code: 409 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ id: string; deleted: boolean }>;
}

export async function apiGetUser(id: string) {
  const res = await authFetch(`/api/v1/admin/users/${id}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (res.status === 404) throw Object.assign(new Error("not_found"), { code: 404 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AppUser>;
}

export async function apiGetUserDossier(id: string) {
  const res = await authFetch(`/api/v1/admin/users/${encodeURIComponent(id)}/dossier`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (res.status === 404) {
    // BFF antiguo sin ruta dossier, o usuario inexistente: intentar detalle simple.
    try {
      const user = await apiGetUser(id);
      return {
        user,
        onboarding: user.onboarding || "missing",
        links: [],
        devices: [],
        sessionsActive: [],
        sessionsHistory: [],
        audit: [],
        transfers: [],
      } satisfies UserDossier;
    } catch (e) {
      throw e;
    }
  }
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<UserDossier>;
}

export async function apiUpdateUserStatus(id: string, status: string, reason: string) {
  const res = await authFetch(`/api/v1/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason }),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

async function listResource<T>(
  path: string,
  q = "",
  status = "",
  extra?: Record<string, string>,
  offset = 0,
  limit = 50,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (extra) Object.entries(extra).forEach(([k, v]) => v && params.set(k, v));
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await authFetch(`${path}?${params}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: T[]; total?: number; limit?: number; offset?: number }>;
}

export const apiListLinks = (q: string, status: string, offset = 0) =>
  listResource<Record<string, unknown>>("/api/v1/admin/links", q, status, undefined, offset);

export const apiListDevices = (q: string, status: string, offset = 0) =>
  listResource<Record<string, unknown>>("/api/v1/admin/devices", q, status, undefined, offset);

export async function apiRevokeDevice(id: string, reason: string) {
  const res = await authFetch(`/api/v1/admin/devices/${id}/revoke`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export const apiListSessions = (q: string, status: string, offset = 0) =>
  listResource<Record<string, unknown>>("/api/v1/admin/sessions", q, status, undefined, offset);

export const apiListAudit = (q: string, action = "", offset = 0) =>
  listResource<Record<string, unknown>>(
    "/api/v1/admin/audit",
    q,
    "",
    action ? { action } : undefined,
    offset,
  );

export async function apiListFlags() {
  const res = await authFetch(`/api/v1/admin/feature-flags`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: { key: string; enabled: boolean; value: unknown; updatedAt: string }[] }>;
}

export async function apiUpsertFlag(key: string, enabled: boolean, value: unknown = {}) {
  const res = await authFetch(`/api/v1/admin/feature-flags/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ enabled, value }),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export const apiListTransfers = (q: string, status: string, offset = 0) =>
  listResource<Record<string, unknown>>("/api/v1/admin/transfers", q, status, undefined, offset);

export async function apiSystemHealth() {
  const res = await authFetch(`/api/v1/admin/system/health`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<Record<string, unknown>>;
}

export async function apiListPromosAdmin() {
  const res = await authFetch(`/api/v1/admin/content/promos`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: PromoAdmin[] }>;
}

export async function apiCreatePromo(body: Partial<PromoAdmin>) {
  const res = await authFetch(`/api/v1/admin/content/promos`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<PromoAdmin>;
}

export async function apiUpdatePromo(id: string, body: Partial<PromoAdmin>) {
  const res = await authFetch(`/api/v1/admin/content/promos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<PromoAdmin>;
}

export async function apiDeletePromo(id: string) {
  const res = await authFetch(`/api/v1/admin/content/promos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiGetContentBlock(key: string) {
  const res = await authFetch(`/api/v1/admin/content/blocks/${encodeURIComponent(key)}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (res.status === 404) throw Object.assign(new Error("not_found"), { code: 404 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ key: string; value: unknown; updatedAt: string }>;
}

export async function apiPutContentBlock(key: string, value: unknown) {
  const res = await authFetch(`/api/v1/admin/content/blocks/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ key: string; value: unknown; updatedAt: string }>;
}

export async function apiListProductsAdmin() {
  const res = await authFetch(`/api/v1/admin/products`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: ProductDefAdmin[] }>;
}

export async function apiGetLoanTip() {
  const res = await authFetch(`/api/v1/admin/loans/tip-config`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<LoanTipConfig>;
}

export async function apiPutLoanTip(body: LoanTipConfig) {
  const res = await authFetch(`/api/v1/admin/loans/tip-config`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiListLoanSimulations(offset = 0, limit = 50) {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  const res = await authFetch(`/api/v1/admin/loans/simulations?${params}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: LoanSimulationAdmin[]; total?: number }>;
}

export async function apiListInsurance() {
  const res = await authFetch(`/api/v1/admin/insurance`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: InsuranceProductAdmin[] }>;
}

export async function apiUpsertInsurance(body: Partial<InsuranceProductAdmin>) {
  const res = await authFetch(`/api/v1/admin/insurance`, {
    method: body.id ? "PUT" : "POST",
    body: JSON.stringify(body),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function apiDeleteInsurance(id: string) {
  const res = await authFetch(`/api/v1/admin/insurance/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export type AdminUserCard = {
  id: string;
  kind: "virtual" | "physical" | string;
  status: string;
  maskedPan: string;
  brand?: string;
  expMonth?: number;
  expYear?: number;
  holderName: string;
  createdAt?: string;
  lastStatusAt?: string;
  issuerLinked?: boolean;
};

export type AdminDeskCard = AdminUserCard & {
  userId: string;
  phoneE164: string;
  displayName: string;
};

export async function apiListAllCards(params: {
  q?: string;
  status?: string;
  kind?: string;
  offset?: number;
}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.status) qs.set("status", params.status);
  if (params.kind) qs.set("kind", params.kind);
  if (params.offset) qs.set("offset", String(params.offset));
  const res = await authFetch(`/api/v1/admin/cards?${qs.toString()}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    items: AdminDeskCard[];
    total: number;
    counts: Record<string, number>;
  }>;
}

export async function apiListUserCards(userId: string) {
  const res = await authFetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/cards`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: AdminUserCard[] }>;
}

export async function apiIssueUserCard(
  userId: string,
  kind: "virtual" | "physical",
  holderName?: string,
) {
  const res = await authFetch(`/api/v1/admin/users/${encodeURIComponent(userId)}/cards`, {
    method: "POST",
    body: JSON.stringify({ kind, holderName }),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AdminUserCard>;
}

export async function apiSetCardFulfillment(userId: string, cardId: string, status: string) {
  const res = await authFetch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardId)}/fulfillment`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AdminUserCard>;
}

export async function apiFreezeUserCard(userId: string, cardId: string, frozen: boolean) {
  const res = await authFetch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardId)}/freeze`,
    { method: "POST", body: JSON.stringify({ frozen }) },
  );
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AdminUserCard>;
}

export async function apiDisableUserCard(userId: string, cardId: string) {
  const res = await authFetch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/cards/${encodeURIComponent(cardId)}/disable`,
    { method: "POST" },
  );
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AdminUserCard>;
}

export async function apiListSupport(status = "", offset = 0) {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (offset) qs.set("offset", String(offset));
  const res = await authFetch(`/api/v1/admin/support?${qs.toString()}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: Record<string, unknown>[]; total: number }>;
}

export async function apiSetSupportStatus(id: string, status: string) {
  const res = await authFetch(`/api/v1/admin/support/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ id: string; status: string }>;
}

export async function apiListAccountRequests(status = "", offset = 0) {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (offset) qs.set("offset", String(offset));
  const res = await authFetch(`/api/v1/admin/account-requests?${qs.toString()}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: Record<string, unknown>[]; total: number }>;
}

export async function apiListUserNotifications(userId: string, offset = 0) {
  const qs = new URLSearchParams();
  if (offset) qs.set("offset", String(offset));
  const res = await authFetch(
    `/api/v1/admin/users/${encodeURIComponent(userId)}/notifications?${qs.toString()}`,
  );
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: Record<string, unknown>[]; total: number }>;
}

