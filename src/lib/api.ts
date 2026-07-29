export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "https://api.bcalixte.cc.cd";

export type Staff = {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  permissions: string[];
};

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
};

const ACCESS_KEY = "calixte_admin_access";
const REFRESH_KEY = "calixte_admin_refresh";
const STAFF_KEY = "calixte_admin_staff";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getStaff(): Staff | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STAFF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Staff;
  } catch {
    return null;
  }
}

export function setSession(access: string, refresh: string, staff: Staff) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(STAFF_KEY);
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
  const res = await fetch(`${API_BASE}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  setSession(data.accessToken, data.refreshToken, data.staff);
  return data.staff as Staff;
}

export async function apiLogout() {
  const refresh = localStorage.getItem(REFRESH_KEY);
  const access = getAccessToken();
  try {
    if (access) {
      await fetch(`${API_BASE}/api/v1/admin/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refreshToken: refresh }),
      });
    }
  } finally {
    clearSession();
  }
}

async function authFetch(path: string, init: RequestInit = {}) {
  const access = getAccessToken();
  if (!access) throw new Error("unauthorized");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${access}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    const refresh = localStorage.getItem(REFRESH_KEY);
    if (!refresh) {
      clearSession();
      throw new Error("unauthorized");
    }
    const r = await fetch(`${API_BASE}/api/v1/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!r.ok) {
      clearSession();
      throw new Error("unauthorized");
    }
    const data = await r.json();
    setSession(data.accessToken, data.refreshToken, data.staff);
    headers.set("Authorization", `Bearer ${data.accessToken}`);
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  }
  return res;
}

export async function apiListUsers(q: string, status: string) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("limit", "50");
  const res = await authFetch(`/api/v1/admin/users?${params}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: AppUser[]; total: number }>;
}

export async function apiGetUser(id: string) {
  const res = await authFetch(`/api/v1/admin/users/${id}`);
  if (res.status === 403) throw Object.assign(new Error("forbidden"), { code: 403 });
  if (res.status === 404) throw Object.assign(new Error("not_found"), { code: 404 });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<AppUser>;
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
