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
  // Start with image hidden; show only after successful load
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const initials = getInitials(nome, cognome);
  const avatarBg = getAvatarColor(cognome ?? nome ?? '?');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const avatarUrl =
    userId && supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/avatars/${userId}/avatar`
      : null;

  const showImg = avatarUrl && !imgError;

  const sizeClass =
    size === 'lg'
      ? 'h-14 w-14'
      : 'h-9 w-9';

  const textClass =
    size === 'lg'
      ? 'text-base font-bold'
      : 'text-xs font-semibold';

  return (
    <div className={`${sizeClass} rounded-full shrink-0 relative`}>
      {/* Always-visible initials layer */}
      <div
        className={`absolute inset-0 rounded-full ${avatarBg} flex items-center justify-center`}
      >
        <span className={`text-white ${textClass}`}>{initials}</span>
      </div>

      {/* Image layer — rendered invisibly until loaded, hides on error */}
      {showImg && (
        <img
          src={avatarUrl}
          alt=""
          className={`absolute inset-0 w-full h-full rounded-full object-cover transition-opacity duration-150 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
