import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { CONTRACT_TEMPLATE_LABELS, type ContractTemplateType } from '@/lib/types';

export default async function OnboardingPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .single();

  if (profile?.onboarding_completed) redirect('/');

  // Fetch collaborators record for pre-fill data (service role to bypass RLS edge cases)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: collab } = await admin
    .from('collaborators')
    .select('id, nome, cognome, username, codice_fiscale, data_nascita, luogo_nascita, provincia_nascita, comune, provincia_residenza, indirizzo, civico_residenza, telefono, iban, intestatario_pagamento, tshirt_size, sono_un_figlio_a_carico, importo_lordo_massimale, tipo_contratto')
    .eq('user_id', user.id)
    .maybeSingle();

  const tipoContratto = (collab?.tipo_contratto ?? null) as ContractTemplateType | null;

  // Fetch community slug for lookup_options
  let communitySlug = 'testbusters';
  if (collab?.id) {
    const { data: ccData } = await admin
      .from('collaborator_communities')
      .select('communities(name)')
      .eq('collaborator_id', collab.id)
      .maybeSingle();
    const rawComm = ccData?.communities as { name: string } | { name: string }[] | null | undefined;
    const commName = (Array.isArray(rawComm) ? rawComm[0]?.name : rawComm?.name) ?? '';
    if (commName) communitySlug = commName.toLowerCase().replace(/\s+/g, '');
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Benvenuto</h1>
          <p className="text-sm text-muted-foreground">Completa il tuo profilo per accedere alla piattaforma</p>
        </div>
        <OnboardingWizard
          prefill={collab ?? null}
          tipoContratto={tipoContratto}
          tipoLabel={tipoContratto ? CONTRACT_TEMPLATE_LABELS[tipoContratto] : null}
          community={communitySlug}
        />
      </div>
    </div>
  );
}
