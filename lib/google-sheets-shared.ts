/**
 * Shared Google Sheets / Drive auth helpers.
 *
 * Centralizes service-account JWT signing via WebCrypto (SubtleCrypto) so the
 * legacy crypto.createPrivateKey path is avoided — it fails on Node 20 /
 * OpenSSL 3.6.0 (Replit) with `DECODER routines::unsupported`.
 *
 * Consumers: lib/google-sheets.ts, lib/contratti-import-sheet.ts,
 * lib/cu-import-sheet.ts (and any future GSheet helper).
 */

import { google } from 'googleapis';
import { webcrypto } from 'crypto';

export const SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

/**
 * Strip PEM headers/footers and decode to raw DER bytes.
 */
export function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^\n]+-----|[\r\n]/g, '');
  return Buffer.from(b64, 'base64');
}

/**
 * Obtain a Google OAuth2 access token for a service account using WebCrypto.
 */
export async function fetchServiceAccountToken(
  clientEmail: string,
  pk: string,
  scope: string = SHEETS_SCOPE,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const signingInput = `${header}.${payload}`;

  const cryptoKey = await webcrypto.subtle.importKey(
    'pkcs8',
    pemToDer(pk),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await webcrypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    Buffer.from(signingInput),
  );

  const assertion = `${signingInput}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${body}`);
  }

  const { access_token } = await res.json() as { access_token: string };
  return access_token;
}

/**
 * Read GOOGLE_SERVICE_ACCOUNT_JSON, normalize the private key, and return a
 * fresh access token. Used by helpers that issue raw `fetch` calls to the
 * Sheets REST API instead of going through `googleapis`.
 */
export async function getAccessToken(scope: string = SHEETS_SCOPE): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');

  const { client_email, private_key } = JSON.parse(raw) as { client_email: string; private_key: string };

  // Replit Secrets can apply multiple levels of escaping to \n in private_key.
  let pk = private_key ?? '';
  while (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
  pk = pk.replace(/\r/g, '');

  return fetchServiceAccountToken(client_email, pk, scope);
}

/**
 * Build an OAuth2 client populated with a fresh access token from the
 * service account in GOOGLE_SERVICE_ACCOUNT_JSON.
 */
export async function buildAuth(scope: string = SHEETS_SCOPE) {
  const accessToken = await getAccessToken(scope);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return auth;
}
