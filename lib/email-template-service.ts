// Email template service — reads templates from DB at send time, falls back to hardcoded.
// Layout config is module-level cached and revalidated every 5 minutes.
// SERVER-ONLY: this file uses SUPABASE_SERVICE_ROLE_KEY.

import 'server-only';

import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  emailIntegrazioni,
  emailApprovato,
  emailRifiutato,
  emailPagato,
  emailDocumentoDaFirmare,
  emailNuovoInviato,
  emailInvito,
  emailNuovoTicket,
  emailRispostaTicket,
  emailNuovaComunicazione,
  emailNuovoEvento,
  emailNuovoContenuto,
  layout as rawLayout,
} from '@/lib/email-templates';
import {
  substituteMarkers,
  type EmailTemplateRow,
  type EmailLayoutConfig,
} from '@/lib/email-preview-utils';

// Re-export types for existing consumers
export type { EmailTemplateRow, EmailLayoutConfig } from '@/lib/email-preview-utils';

// ── Layout config cache ────────────────────────────────────────────────────────

let cachedLayout: EmailLayoutConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getLayoutConfig(): Promise<EmailLayoutConfig | null> {
  const now = Date.now();
  if (cachedLayout && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedLayout;
  }
  const svc = getServiceClient();
  const { data } = await svc.from('email_layout_config').select('*').limit(1).single();
  if (data) {
    cachedLayout = data as EmailLayoutConfig;
    cacheTimestamp = now;
    return cachedLayout;
  }
  return null;
}

// ── HTML building helpers (server-side only, used by getRenderedEmail) ────────

const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

function buildGreeting(nome: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;color:#374151;">Ciao <strong>${nome}</strong>,</p>`;
}

function buildHighlight(rows: { label: string; value: string }[], data: Record<string, string>): string {
  const cells = rows
    .map((r) => {
      const label = substituteMarkers(r.label, data);
      const value = substituteMarkers(r.value, data);
      return `<tr>
          <td style="padding:8px 16px;font-size:12px;color:#6b7280;width:40%;">${label}</td>
          <td style="padding:8px 16px;font-size:13px;color:#111827;font-weight:600;">${value}</td>
        </tr>`;
    })
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0"
    style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;border-collapse:collapse;">
    ${cells}
  </table>`;
}

function buildBodyText(text: string): string {
  if (text.trimStart().startsWith('<')) return text;
  return `<p style="margin:0 0 8px;font-size:14px;color:#374151;line-height:1.6;">${text}</p>`;
}

function buildCtaButton(label: string, brandColor: string, href?: string): string {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href ?? APP_URL}"
       style="display:inline-block;background:${brandColor};color:#ffffff;text-decoration:none;
              font-size:14px;font-weight:600;padding:12px 32px;border-radius:8px;letter-spacing:0.02em;">
      ${label}
    </a>
  </div>`;
}

function buildLayout(bodyContent: string, cfg: EmailLayoutConfig): string {
  const logoSrc = cfg.logo_url.startsWith('/') ? `${APP_URL}${cfg.logo_url}` : cfg.logo_url;
  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${cfg.header_title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${cfg.brand_color};padding:28px 40px;text-align:center;">
              <img src="${logoSrc}" width="56" height="56" alt="Logo" style="display:inline-block;border-radius:50%;" />
              <div style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.05em;margin-top:10px;text-transform:uppercase;">${cfg.header_title}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              ${bodyContent}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.6;">
                Sede legale (non aperta al pubblico)<br/>
                ${cfg.footer_address}
              </p>
              <p style="margin:0;font-size:10px;color:#d1d5db;line-height:1.6;">
                ${cfg.footer_legal}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Fallback map ──────────────────────────────────────────────────────────────

type FallbackFn = (data: Record<string, string>) => { subject: string; html: string };

const FALLBACKS: Record<string, FallbackFn> = {
  E1: (d) => emailIntegrazioni({ nome: d.nome, tipo: (d.tipo as 'Compenso' | 'Rimborso') ?? 'Compenso', importo: parseFloat(d.importo ?? '0'), data: d.data, nota: d.nota }),
  E2: (d) => emailApprovato({ nome: d.nome, tipo: (d.tipo as 'Compenso' | 'Rimborso') ?? 'Compenso', importo: parseFloat(d.importo ?? '0'), data: d.data }),
  E3: (d) => emailRifiutato({ nome: d.nome, tipo: (d.tipo as 'Compenso' | 'Rimborso') ?? 'Compenso', importo: parseFloat(d.importo ?? '0'), data: d.data }),
  E4: (d) => emailPagato({ nome: d.nome, tipo: (d.tipo as 'Compenso' | 'Rimborso') ?? 'Compenso', importo: parseFloat(d.importo ?? '0'), dataPagamento: d.data }),
  E5: (d) => emailDocumentoDaFirmare({ nome: d.nome, titoloDocumento: d.titoloDocumento, data: d.data, link: d.link }),
  E6: (d) => emailNuovoInviato({ nomeResponsabile: d.nomeResponsabile, nomeCollaboratore: d.nomeCollaboratore, tipo: (d.tipo as 'Compenso' | 'Rimborso') ?? 'Compenso', importo: parseFloat(d.importo ?? '0'), community: d.community, data: d.data }),
  E7: (d) => emailNuovoTicket({ nomeResponsabile: d.nomeResponsabile, nomeCollaboratore: d.nomeCollaboratore, oggetto: d.oggetto, categoria: d.categoria, data: d.data }),
  E8: (d) => emailInvito({ email: d.email, password: d.password, ruolo: d.ruolo }),
  E9: (d) => emailRispostaTicket({ nome: d.nome, oggetto: d.oggetto, data: d.data }),
  E10: (d) => emailNuovaComunicazione({ nome: d.nome, titolo: d.titolo, data: d.data }),
  E11: (d) => emailNuovoEvento({ nome: d.nome, titolo: d.titolo, data: d.data }),
  E12: (d) => emailNuovoContenuto({ nome: d.nome, tipo: d.tipo, titolo: d.titolo, data: d.data }),
};

// ── Main export ───────────────────────────────────────────────────────────────

export async function getRenderedEmail(
  key: string,
  data: Record<string, string>,
): Promise<{ subject: string; html: string }> {
  try {
    const svc = getServiceClient();

    const [{ data: tmpl, error: tmplError }, layoutCfg] = await Promise.all([
      svc.from('email_templates').select('*').eq('key', key).single(),
      getLayoutConfig(),
    ]);

    if (tmplError || !tmpl || !layoutCfg) {
      throw new Error('Template or layout not found');
    }

    const template = tmpl as EmailTemplateRow;
    const subject = substituteMarkers(template.subject, data);

    const parts: string[] = [];

    // Greeting — only if 'nome' is provided
    if (data.nome) {
      parts.push(buildGreeting(data.nome));
    }

    // Body before
    if (template.body_before) {
      parts.push(buildBodyText(substituteMarkers(template.body_before, data)));
    }

    // Highlight rows
    if (template.has_highlight && Array.isArray(template.highlight_rows) && template.highlight_rows.length > 0) {
      parts.push(buildHighlight(template.highlight_rows, data));
    }

    // Body after
    if (template.body_after) {
      parts.push(buildBodyText(substituteMarkers(template.body_after, data)));
    }

    // CTA link
    const ctaHref = data.link ? `${APP_URL}${data.link}` : APP_URL;
    parts.push(buildCtaButton(substituteMarkers(template.cta_label, data), layoutCfg.brand_color, ctaHref));

    const html = buildLayout(parts.join('\n'), layoutCfg);

    return { subject, html };
  } catch (err) {
    // Log template rendering error for operational visibility (A2)
    console.error(`[email-template] failed to render ${key}:`, err instanceof Error ? err.message : err);
    // Fallback to hardcoded template
    const fallback = FALLBACKS[key];
    if (fallback) {
      return fallback(data);
    }
    // Last resort: empty email
    return { subject: '', html: rawLayout('') };
  }
}
