// Community-aware withholding (ritenuta d'acconto) helpers.
// Pure functions — no server-only deps, safe to import in Client Components.

import type { ContractTemplateType } from '@/lib/types';

// P4M: 20% applied to 60% of gross (imponibile = 60% lordo).
// TB (default): 20% applied to 100% of gross.
export function calcRitenuta(communityName: string, lordoCompensi: number): number {
  if (communityName === 'Peer4Med') return Math.round(lordoCompensi * 0.6 * 0.2 * 100) / 100;
  return Math.round(lordoCompensi * 0.2 * 100) / 100;
}

export function getContractTemplateTipo(communityName: string): ContractTemplateType {
  return communityName === 'Peer4Med' ? 'OCCASIONALE_P4M' : 'OCCASIONALE';
}

export function getReceiptTemplateTipo(communityName: string): ContractTemplateType {
  return communityName === 'Peer4Med' ? 'RICEVUTA_PAGAMENTO_P4M' : 'RICEVUTA_PAGAMENTO';
}
