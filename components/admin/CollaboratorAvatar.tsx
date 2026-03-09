'use client';

import { useState } from 'react';

interface CollaboratorAvatarProps {
  userId: string | null;
  nome: string | null;
  cognome: string | null;
  size?: 'sm' | 'lg';
}

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-teal-600',
  'bg-indigo-600',
];

function getInitials(nome: string | null, cognome: string | null): string {
  return [nome, cognome]
    .filter(Boolean)
    .map((s) => s![0].toUpperCase())
    .join('')
    .slice(0, 2) || '?';
}

function getAvatarColor(seed: string): string {
  return AVATAR_COLORS[(seed.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export default function CollaboratorAvatar({
  userId,
  nome,
  cognome,
  size = 'sm',
}: CollaboratorAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = getInitials(nome, cognome);
  const avatarBg = getAvatarColor(cognome ?? nome ?? '?');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const avatarUrl = userId && supabaseUrl
    ? `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/avatar`
    : null;

  const showImg = avatarUrl && !imgError;

  const sizeClass = size === 'lg'
    ? 'h-14 w-14 text-lg font-bold'
    : 'h-9 w-9 text-xs font-semibold';

  if (showImg) {
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden shrink-0 ring-1 ring-border`}>
        <img
          src={avatarUrl}
          alt={`${nome ?? ''} ${cognome ?? ''}`.trim()}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${avatarBg} flex items-center justify-center shrink-0`}>
      <span className="text-white">{initials}</span>
    </div>
  );
}
