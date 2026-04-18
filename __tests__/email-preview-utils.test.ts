import { describe, it, expect } from 'vitest';
import { substituteMarkers, buildPreviewHtml } from '@/lib/email-preview-utils';
import type { EmailTemplateRow, EmailLayoutConfig } from '@/lib/email-preview-utils';

describe('substituteMarkers', () => {
  it('replaces known markers', () => {
    expect(substituteMarkers('Ciao {{nome}}!', { nome: 'Mario' })).toBe('Ciao Mario!');
  });

  it('replaces multiple markers', () => {
    const result = substituteMarkers('{{nome}} ha {{importo}}€', { nome: 'Mario', importo: '100' });
    expect(result).toBe('Mario ha 100€');
  });

  it('preserves unknown markers', () => {
    expect(substituteMarkers('Ciao {{nome}}!', {})).toBe('Ciao {{nome}}!');
  });

  it('handles text with no markers', () => {
    expect(substituteMarkers('Testo semplice', { nome: 'Mario' })).toBe('Testo semplice');
  });

  it('handles empty string', () => {
    expect(substituteMarkers('', { nome: 'Mario' })).toBe('');
  });
});

const MOCK_LAYOUT: EmailLayoutConfig = {
  id: 'layout-1',
  brand_color: '#1e3a5f',
  logo_url: '/logo.png',
  header_title: 'Staff Manager',
  footer_address: 'Via Test 1, Roma',
  footer_legal: 'Test Legal',
  updated_at: '2026-01-01',
};

const MOCK_TEMPLATE: EmailTemplateRow = {
  id: 'tpl-1',
  key: 'test_email',
  label: 'Test Email',
  event_group: 'test',
  has_highlight: false,
  subject: 'Oggetto: {{nome}}',
  body_before: 'Il tuo {{tipo}} è stato aggiornato.',
  highlight_rows: [],
  body_after: '',
  cta_label: 'Vai alla piattaforma',
  available_markers: ['nome', 'tipo'],
  updated_at: '2026-01-01',
};

describe('buildPreviewHtml', () => {
  it('returns a full HTML document', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario', tipo: 'compenso' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes greeting with nome', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario' });
    expect(html).toContain('Ciao <strong>Mario</strong>');
  });

  it('substitutes markers in body_before', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario', tipo: 'compenso' });
    expect(html).toContain('Il tuo compenso è stato aggiornato.');
  });

  it('includes CTA button', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario' });
    expect(html).toContain('Vai alla piattaforma');
  });

  it('includes layout header title', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario' });
    expect(html).toContain('Staff Manager');
  });

  it('includes footer address', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario' });
    expect(html).toContain('Via Test 1, Roma');
  });

  it('renders highlight table when has_highlight=true', () => {
    const tpl: EmailTemplateRow = {
      ...MOCK_TEMPLATE,
      has_highlight: true,
      highlight_rows: [
        { label: 'Importo', value: '{{importo}}€' },
      ],
    };
    const html = buildPreviewHtml(tpl, MOCK_LAYOUT, { nome: 'Mario', importo: '200' });
    expect(html).toContain('Importo');
    expect(html).toContain('200€');
  });

  it('skips highlight when has_highlight=false', () => {
    const html = buildPreviewHtml(MOCK_TEMPLATE, MOCK_LAYOUT, { nome: 'Mario' });
    expect(html).not.toContain('border-radius:8px;margin:20px 0');
  });
});
