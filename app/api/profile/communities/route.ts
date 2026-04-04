// Community assignment is admin-only.
// Collaboratori cannot change their own community — only amministrazione can via
// PATCH /api/admin/collaboratori/[id]/profile.
// This route is intentionally disabled.
import { NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function PATCH(_request: Request) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
