import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { z } from 'zod';

const bodySchema = z.object({
  banner_content: z.string(),
  banner_active: z.boolean(),
  banner_link_url: z.string().optional(),
  banner_link_label: z.string().optional(),
  banner_link_new_tab: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ communityId: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'amministrazione') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 });
  }

  const { communityId } = await params;
  const { banner_content, banner_active, banner_link_url, banner_link_label, banner_link_new_tab } = parsed.data;

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error } = await svc
    .from('communities')
    .update({
      banner_content,
      banner_active,
      banner_link_url: banner_link_url ?? null,
      banner_link_label: banner_link_label ?? null,
      banner_link_new_tab: banner_link_new_tab ?? false,
      banner_updated_at: new Date().toISOString(),
    })
    .eq('id', communityId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
