import type { Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3001';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ACCOUNTS: Record<string, { email: string; password: string }> = {
  collaboratore_tb: { email: 'collaboratore_tb_test@test.com', password: 'Testbusters123' },
  collaboratore_p4m: { email: 'collaboratore_p4m_test@test.com', password: 'Testbusters123' },
  responsabile_compensi: { email: 'responsabile_compensi_test@test.com', password: 'Testbusters123' },
  responsabile_cittadino: { email: 'responsabile_cittadino_test@test.com', password: 'Testbusters123' },
  admin: { email: 'admin_test@test.com', password: 'Testbusters123' },
};

export async function login(page: Page, role: keyof typeof ACCOUNTS) {
  const { email, password } = ACCOUNTS[role];
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 });
}

/** Supabase REST helper — GET with optional query params */
export async function db<T>(table: string, params?: Record<string, string>): Promise<T[]> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  return res.json();
}

/** Supabase REST helper — GET single row */
export async function dbFirst<T>(table: string, params?: Record<string, string>): Promise<T | null> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'return=representation',
    },
  });
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** Supabase REST helper — POST */
export async function dbPost<T>(table: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

/** Supabase REST helper — DELETE */
export async function dbDelete(table: string, filter: Record<string, string>): Promise<void> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  await fetch(url.toString(), {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

/** Supabase REST helper — PATCH */
export async function dbPatch(table: string, filter: Record<string, string>, body: Record<string, unknown>): Promise<void> {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  Object.entries(filter).forEach(([k, v]) => url.searchParams.set(k, v));
  await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/** Delete an auth user by ID (admin API) */
export async function deleteAuthUser(userId: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}
