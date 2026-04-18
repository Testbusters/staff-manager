import { describe, it, expect } from 'vitest';
import { calcRitenuta, getContractTemplateTipo, getReceiptTemplateTipo } from '@/lib/ritenuta';

describe('calcRitenuta', () => {
  describe('Testbusters (default community)', () => {
    it('applies 20% on gross', () => {
      expect(calcRitenuta('Testbusters', 1000)).toBe(200);
    });

    it('handles decimal amounts', () => {
      expect(calcRitenuta('Testbusters', 1234.56)).toBe(246.91);
    });

    it('rounds to 2 decimal places', () => {
      // 333.33 * 0.2 = 66.666 → 66.67
      expect(calcRitenuta('Testbusters', 333.33)).toBe(66.67);
    });

    it('returns 0 for zero gross', () => {
      expect(calcRitenuta('Testbusters', 0)).toBe(0);
    });

    it('handles very small amounts', () => {
      // 0.01 * 0.2 = 0.002 → 0
      expect(calcRitenuta('Testbusters', 0.01)).toBe(0);
    });

    it('handles large amounts', () => {
      expect(calcRitenuta('Testbusters', 50000)).toBe(10000);
    });
  });

  describe('Peer4Med', () => {
    it('applies 20% on 60% of gross (imponibile)', () => {
      // 1000 * 0.6 * 0.2 = 120
      expect(calcRitenuta('Peer4Med', 1000)).toBe(120);
    });

    it('handles decimal amounts', () => {
      // 1234.56 * 0.6 * 0.2 = 148.1472 → 148.15
      expect(calcRitenuta('Peer4Med', 1234.56)).toBe(148.15);
    });

    it('rounds to 2 decimal places', () => {
      // 333.33 * 0.6 * 0.2 = 39.9996 → 40
      expect(calcRitenuta('Peer4Med', 333.33)).toBe(40);
    });

    it('returns 0 for zero gross', () => {
      expect(calcRitenuta('Peer4Med', 0)).toBe(0);
    });
  });

  describe('unknown community (defaults to TB formula)', () => {
    it('applies 20% on gross for unknown community name', () => {
      expect(calcRitenuta('UnknownCommunity', 1000)).toBe(200);
    });

    it('applies 20% for empty string', () => {
      expect(calcRitenuta('', 1000)).toBe(200);
    });
  });
});

describe('getContractTemplateTipo', () => {
  it('returns OCCASIONALE for Testbusters', () => {
    expect(getContractTemplateTipo('Testbusters')).toBe('OCCASIONALE');
  });

  it('returns OCCASIONALE_P4M for Peer4Med', () => {
    expect(getContractTemplateTipo('Peer4Med')).toBe('OCCASIONALE_P4M');
  });

  it('returns OCCASIONALE for unknown community', () => {
    expect(getContractTemplateTipo('Unknown')).toBe('OCCASIONALE');
  });
});

describe('getReceiptTemplateTipo', () => {
  it('returns RICEVUTA_PAGAMENTO for Testbusters', () => {
    expect(getReceiptTemplateTipo('Testbusters')).toBe('RICEVUTA_PAGAMENTO');
  });

  it('returns RICEVUTA_PAGAMENTO_P4M for Peer4Med', () => {
    expect(getReceiptTemplateTipo('Peer4Med')).toBe('RICEVUTA_PAGAMENTO_P4M');
  });

  it('returns RICEVUTA_PAGAMENTO for unknown community', () => {
    expect(getReceiptTemplateTipo('Unknown')).toBe('RICEVUTA_PAGAMENTO');
  });
});
