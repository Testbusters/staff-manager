/**
 * Unit tests for Block 10:
 * - validTipi now only allows CONTRATTO_OCCASIONALE and CU
 * - DocumentType / DocumentMacroType no longer include RICEVUTA_PAGAMENTO
 * - DOCUMENT_MACRO_TYPE mapping is consistent
 */
import { describe, it, expect } from 'vitest';
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_MACRO_TYPE,
  DOCUMENT_MACRO_TYPE_LABELS,
  type DocumentType,
  type DocumentMacroType,
} from '@/lib/types';

const validTipi = ['CONTRATTO_OCCASIONALE', 'CU'];

describe('documents validTipi', () => {
  it('accepts CONTRATTO_OCCASIONALE', () => {
    expect(validTipi.includes('CONTRATTO_OCCASIONALE')).toBe(true);
  });

  it('accepts CU', () => {
    expect(validTipi.includes('CU')).toBe(true);
  });

  it('rejects RICEVUTA_PAGAMENTO', () => {
    expect(validTipi.includes('RICEVUTA_PAGAMENTO')).toBe(false);
  });

  it('rejects CONTRATTO_COCOCO', () => {
    expect(validTipi.includes('CONTRATTO_COCOCO')).toBe(false);
  });

  it('rejects CONTRATTO_PIVA', () => {
    expect(validTipi.includes('CONTRATTO_PIVA')).toBe(false);
  });
});

describe('DocumentType labels', () => {
  it('has exactly 2 entries', () => {
    expect(Object.keys(DOCUMENT_TYPE_LABELS).length).toBe(2);
  });

  it('does not include RICEVUTA_PAGAMENTO', () => {
    expect('RICEVUTA_PAGAMENTO' in DOCUMENT_TYPE_LABELS).toBe(false);
  });
});

describe('DocumentMacroType', () => {
  it('maps CONTRATTO_OCCASIONALE → CONTRATTO', () => {
    expect(DOCUMENT_MACRO_TYPE['CONTRATTO_OCCASIONALE']).toBe('CONTRATTO');
  });

  it('maps CU → CU', () => {
    expect(DOCUMENT_MACRO_TYPE['CU']).toBe('CU');
  });

  it('has exactly 2 macro labels', () => {
    expect(Object.keys(DOCUMENT_MACRO_TYPE_LABELS).length).toBe(2);
  });

  it('does not have RICEVUTA_PAGAMENTO macro label', () => {
    expect('RICEVUTA_PAGAMENTO' in DOCUMENT_MACRO_TYPE_LABELS).toBe(false);
  });
});
