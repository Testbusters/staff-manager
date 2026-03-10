/**
 * Google Drive helper for CU import.
 * Uses WebCrypto JWT (drive.readonly scope).
 * All calls include supportsAllDrives=true + includeItemsFromAllDrives=true.
 */

import { webcrypto } from 'crypto';

function pemToDer(pem: string): Buffer {
  const b64 = pem.replace(/-----[^\n]+-----|[\r\n]/g, '');
  return Buffer.from(b64, 'base64');
}

async function getDriveToken(): Promise<string> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set');

  const { client_email, private_key: rawKey } = JSON.parse(raw) as { client_email: string; private_key: string };
  let pk = rawKey;
  while (pk.includes('\\n')) pk = pk.replace(/\\n/g, '\n');
  pk = pk.replace(/\r/g, '');

  const now     = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: client_email, scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })).toString('base64url');

  const si  = `${header}.${payload}`;
  const key = await webcrypto.subtle.importKey('pkcs8', pemToDer(pk),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(si));
  const assertion = `${si}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  const { access_token, error } = await res.json() as { access_token?: string; error?: string };
  if (!access_token) throw new Error(`Google Drive token error: ${error}`);
  return access_token;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Retry wrapper for fetch calls that may return 429 (rate limit) or 503 (transient).
 * Checks HTTP status after fetch (fetch itself only throws on network errors).
 */
async function withRetry(fn: () => Promise<Response>, maxAttempts = 3, baseDelay = 1000): Promise<Response> {
  let last: Response | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    last = await fn();
    if (last.status !== 429 && last.status !== 503) return last;
    if (attempt < maxAttempts - 1) await sleep(baseDelay * Math.pow(2, attempt));
  }
  return last!;
}

/**
 * Build a Map<filename, fileId> for all non-trashed files in a Drive folder.
 * Handles pagination. Works with Shared Drive folders.
 */
export async function buildFolderMap(folderId: string): Promise<Map<string, string>> {
  const token = await getDriveToken();
  const map   = new Map<string, string>();
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q:                         `'${folderId}' in parents and trashed = false`,
      fields:                    'nextPageToken,files(id,name)',
      pageSize:                  '1000',
      supportsAllDrives:         'true',
      includeItemsFromAllDrives: 'true',
      corpora:                   'allDrives',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await withRetry(() =>
      fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    );

    const data = await res.json() as {
      files?:         { id: string; name: string }[];
      nextPageToken?: string;
      error?:         { message: string };
    };

    if (data.error) throw new Error(`Drive API error: ${data.error.message}`);
    (data.files ?? []).forEach(f => map.set(f.name, f.id));
    pageToken = data.nextPageToken;
  } while (pageToken);

  return map;
}

/**
 * Download a Drive file by fileId and return its content as a Buffer.
 */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const token  = await getDriveToken();
  const params = new URLSearchParams({ alt: 'media', supportsAllDrives: 'true' });

  const res = await withRetry(() =>
    fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive download failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
