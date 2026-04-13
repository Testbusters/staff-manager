import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, citta_responsabile')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'responsabile_cittadino') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const corsoId = searchParams.get('corso_id');
  if (!corsoId) return NextResponse.json({ error: 'corso_id required' }, { status: 400 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Verify corso belongs to resp.citt's city
  const { data: corso } = await svc
    .from('corsi')
    .select('id, codice_identificativo, citta')
    .eq('id', corsoId)
    .maybeSingle();

  if (!corso) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (corso.citta !== profile.citta_responsabile) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Two-step fetch: lezioni → assegnazioni → collaborators
  const { data: lezioni } = await svc
    .from('lezioni')
    .select('id, data, orario_inizio, orario_fine, materie')
    .eq('corso_id', corsoId)
    .order('data')
    .order('orario_inizio');

  const lezioniIds = (lezioni ?? []).map((l) => l.id);

  if (lezioniIds.length === 0) {
    const csv = 'data,orario_inizio,orario_fine,materia,nome,cognome,ruolo\n';
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="assegnazioni-${corso.codice_identificativo}.csv"`,
      },
    });
  }

  const { data: assegnazioni } = await svc
    .from('assegnazioni')
    .select('lezione_id, collaborator_id, ruolo')
    .in('lezione_id', lezioniIds);

  const collabIds = [...new Set((assegnazioni ?? []).map((a) => a.collaborator_id))];
  const { data: collabs } = collabIds.length > 0
    ? await svc.from('collaborators').select('id, nome, cognome').in('id', collabIds)
    : { data: [] };

  const collabMap = new Map((collabs ?? []).map((c) => [c.id, c]));
  const lezioneMap = new Map((lezioni ?? []).map((l) => [l.id, l]));

  const rows = (assegnazioni ?? []).map((a) => {
    const lez = lezioneMap.get(a.lezione_id);
    const col = collabMap.get(a.collaborator_id);
    return [
      lez?.data ?? '',
      lez?.orario_inizio ?? '',
      lez?.orario_fine ?? '',
      (lez?.materie ?? []).join(';'),
      col?.nome ?? '',
      col?.cognome ?? '',
      a.ruolo,
    ];
  });

  const header = 'data,orario_inizio,orario_fine,materia,nome,cognome,ruolo';
  const csv = [header, ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n') + '\n';

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="assegnazioni-${corso.codice_identificativo}.csv"`,
    },
  });
}
