// DB helpers for notification dispatch: settings lookup + person info fetching.
// All functions are fire-and-forget safe — they never throw; they return empty on failure.

import type { SupabaseClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Svc = SupabaseClient<any, any, any>;

export interface NotificationSetting {
  inapp_enabled: boolean;
  email_enabled: boolean;
  telegram_enabled: boolean;
}

export type SettingsMap = Map<string, NotificationSetting>;

export interface PersonInfo {
  user_id: string;
  email: string;
  nome: string;
  cognome: string;
  telegram_chat_id: bigint | null;
}

// Returns a Map keyed by "event_key:recipient_role"
export async function getNotificationSettings(svc: Svc): Promise<SettingsMap> {
  const { data } = await svc
    .from('notification_settings')
    .select('event_key, recipient_role, inapp_enabled, email_enabled, telegram_enabled');

  const map = new Map<string, NotificationSetting>();
  for (const row of data ?? []) {
    map.set(`${row.event_key}:${row.recipient_role}`, {
      inapp_enabled: row.inapp_enabled,
      email_enabled: row.email_enabled,
      telegram_enabled: row.telegram_enabled ?? false,
    });
  }
  return map;
}

// Fetches collaborator info + email from auth.
export async function getCollaboratorInfo(
  collaboratorId: string,
  svc: Svc,
): Promise<PersonInfo | null> {
  const { data: collab } = await svc
    .from('collaborators')
    .select('user_id, nome, cognome, telegram_chat_id')
    .eq('id', collaboratorId)
    .single();

  if (!collab?.user_id) return null;

  const { data: authUser } = await svc.auth.admin.getUserById(collab.user_id);
  return {
    user_id: collab.user_id,
    email: authUser?.user?.email ?? '',
    nome: collab.nome ?? '',
    cognome: collab.cognome ?? '',
    telegram_chat_id: collab.telegram_chat_id != null ? BigInt(collab.telegram_chat_id) : null,
  };
}

// Returns active responsabili assigned to a given community (with email).
export async function getResponsabiliForCommunity(
  communityId: string,
  svc: Svc,
): Promise<PersonInfo[]> {
  const { data: uca } = await svc
    .from('user_community_access')
    .select('user_id')
    .eq('community_id', communityId);

  if (!uca || uca.length === 0) return [];

  const userIds = uca.map((u) => u.user_id);

  const { data: profiles } = await svc
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'responsabile_compensi')
    .eq('is_active', true)
    .in('user_id', userIds);

  const activeIds = (profiles ?? []).map((p) => p.user_id);
  if (activeIds.length === 0) return [];

  const [{ data: collabs }, { data: authData }] = await Promise.all([
    svc.from('collaborators').select('user_id, nome, cognome, telegram_chat_id').in('user_id', activeIds),
    svc.auth.admin.listUsers(),
  ]);

  const collabMap = Object.fromEntries((collabs ?? []).map((c) => [c.user_id, c]));
  const emailMap = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  );

  return activeIds.map((uid) => ({
    user_id: uid,
    email: emailMap[uid] ?? '',
    nome: collabMap[uid]?.nome ?? '',
    cognome: collabMap[uid]?.cognome ?? '',
    telegram_chat_id: collabMap[uid]?.telegram_chat_id != null
      ? BigInt(collabMap[uid].telegram_chat_id) : null,
  }));
}

// Returns active responsabili for all communities a collaborator belongs to.
export async function getResponsabiliForCollaborator(
  collaboratorId: string,
  svc: Svc,
): Promise<PersonInfo[]> {
  const { data: cc } = await svc
    .from('collaborator_communities')
    .select('community_id')
    .eq('collaborator_id', collaboratorId);

  if (!cc || cc.length === 0) return [];

  const communityIds = [...new Set(cc.map((r) => r.community_id))];

  const { data: uca } = await svc
    .from('user_community_access')
    .select('user_id')
    .in('community_id', communityIds);

  if (!uca || uca.length === 0) return [];

  const userIds = [...new Set(uca.map((u) => u.user_id))];

  const { data: profiles } = await svc
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'responsabile_compensi')
    .eq('is_active', true)
    .in('user_id', userIds);

  const activeIds = (profiles ?? []).map((p) => p.user_id);
  if (activeIds.length === 0) return [];

  const [{ data: collabs }, { data: authData }] = await Promise.all([
    svc.from('collaborators').select('user_id, nome, cognome, telegram_chat_id').in('user_id', activeIds),
    svc.auth.admin.listUsers(),
  ]);

  const collabMap = Object.fromEntries((collabs ?? []).map((c) => [c.user_id, c]));
  const emailMap = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  );

  return activeIds.map((uid) => ({
    user_id: uid,
    email: emailMap[uid] ?? '',
    nome: collabMap[uid]?.nome ?? '',
    cognome: collabMap[uid]?.cognome ?? '',
    telegram_chat_id: collabMap[uid]?.telegram_chat_id != null
      ? BigInt(collabMap[uid].telegram_chat_id) : null,
  }));
}

// Returns active collaboratori filtered by community membership.
// communityIds = [] means "all communities" → returns all active collaboratori.
export async function getCollaboratoriForCommunities(
  communityIds: string[],
  svc: Svc,
): Promise<PersonInfo[]> {
  if (communityIds.length === 0) return getAllActiveCollaboratori(svc);

  const { data: cc } = await svc
    .from('collaborator_communities')
    .select('collaborator_id')
    .in('community_id', communityIds);

  if (!cc || cc.length === 0) return [];

  const collabIds = [...new Set(cc.map((r: { collaborator_id: string }) => r.collaborator_id))];

  const { data: collabs } = await svc
    .from('collaborators')
    .select('user_id, nome, cognome, telegram_chat_id')
    .in('id', collabIds);

  if (!collabs || collabs.length === 0) return [];

  const userIds = collabs.map((c: { user_id: string }) => c.user_id);

  const { data: profiles } = await svc
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'collaboratore')
    .eq('is_active', true)
    .in('user_id', userIds);

  const activeIds = (profiles ?? []).map((p: { user_id: string }) => p.user_id);
  if (activeIds.length === 0) return [];

  const { data: authData } = await svc.auth.admin.listUsers();

  const collabMap = Object.fromEntries(
    (collabs as { user_id: string; nome: string; cognome: string; telegram_chat_id: number | null }[]).map((c) => [c.user_id, c]),
  );
  const emailMap = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  );

  return activeIds.map((uid: string) => ({
    user_id: uid,
    email: emailMap[uid] ?? '',
    nome: collabMap[uid]?.nome ?? '',
    cognome: collabMap[uid]?.cognome ?? '',
    telegram_chat_id: collabMap[uid]?.telegram_chat_id != null
      ? BigInt(collabMap[uid].telegram_chat_id) : null,
  }));
}

// Returns active collaboratori in the given communities whose citta matches the given city.
// Used for city-scoped event notifications.
export async function getCollaboratoriForCity(
  citta: string,
  communityIds: string[],
  svc: Svc,
): Promise<PersonInfo[]> {
  const communityCollabs = await getCollaboratoriForCommunities(communityIds, svc);
  if (communityCollabs.length === 0) return [];

  const userIds = communityCollabs.map((c) => c.user_id);

  const { data: cityCollabs } = await svc
    .from('collaborators')
    .select('user_id')
    .eq('citta', citta)
    .in('user_id', userIds);

  const cityUserIds = new Set((cityCollabs ?? []).map((c: { user_id: string }) => c.user_id));
  return communityCollabs.filter((c) => cityUserIds.has(c.user_id));
}

// Returns all active collaboratori with their email (for broadcast content notifications).
export async function getAllActiveCollaboratori(svc: Svc): Promise<PersonInfo[]> {
  const { data: profiles } = await svc
    .from('user_profiles')
    .select('user_id')
    .eq('role', 'collaboratore')
    .eq('is_active', true);

  const activeIds = (profiles ?? []).map((p) => p.user_id);
  if (activeIds.length === 0) return [];

  const [{ data: collabs }, { data: authData }] = await Promise.all([
    svc.from('collaborators').select('user_id, nome, cognome, telegram_chat_id').in('user_id', activeIds),
    svc.auth.admin.listUsers(),
  ]);

  const collabMap = Object.fromEntries((collabs ?? []).map((c) => [c.user_id, c]));
  const emailMap = Object.fromEntries(
    (authData?.users ?? []).map((u) => [u.id, u.email ?? '']),
  );

  return activeIds.map((uid) => ({
    user_id: uid,
    email: emailMap[uid] ?? '',
    nome: collabMap[uid]?.nome ?? '',
    cognome: collabMap[uid]?.cognome ?? '',
    telegram_chat_id: collabMap[uid]?.telegram_chat_id != null
      ? BigInt(collabMap[uid].telegram_chat_id) : null,
  }));
}

// Shortcut: get responsabili for a user (via their collaborator record → communities).
export async function getResponsabiliForUser(
  userId: string,
  svc: Svc,
): Promise<PersonInfo[]> {
  const { data: collab } = await svc
    .from('collaborators')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (!collab) return [];
  return getResponsabiliForCollaborator(collab.id, svc);
}
