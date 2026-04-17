// Pure HTML building helpers for email template preview.
// Client-safe — no server dependencies, no secrets.

export interface EmailTemplateRow {
  id: string;
  key: string;
  label: string;
  event_group: string;
  has_highlight: boolean;
  subject: string;
  body_before: string;
  highlight_rows: { label: string; value: string }[];
  body_after: string;
  cta_label: string;
  available_markers: string[];
  updated_at: string;
}

export interface EmailLayoutConfig {
  id: string;
  brand_color: string;
  logo_url: string;
  header_title: string;
  footer_address: string;
  footer_legal: string;
  updated_at: string;
}

const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function substituteMarkers(text: string, data: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}

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

/**
 * Build a full email HTML preview from template data and layout config.
 * Pure function — no DB calls, no secrets. Safe for client components.
 */
export function buildPreviewHtml(
  template: EmailTemplateRow,
  layoutCfg: EmailLayoutConfig,
  data: Record<string, string>,
): string {
  const parts: string[] = [];

  if (data.nome) {
    parts.push(buildGreeting(data.nome));
  }
  if (template.body_before) {
    parts.push(buildBodyText(substituteMarkers(template.body_before, data)));
  }
  if (template.has_highlight && Array.isArray(template.highlight_rows) && template.highlight_rows.length > 0) {
    parts.push(buildHighlight(template.highlight_rows, data));
  }
  if (template.body_after) {
    parts.push(buildBodyText(substituteMarkers(template.body_after, data)));
  }
  const ctaHref = data.link ? `${APP_URL}${data.link}` : APP_URL;
  parts.push(buildCtaButton(substituteMarkers(template.cta_label, data), layoutCfg.brand_color, ctaHref));

  return buildLayout(parts.join('\n'), layoutCfg);
}
