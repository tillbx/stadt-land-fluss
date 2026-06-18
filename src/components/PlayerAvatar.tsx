import React from 'react';
import { getAvatarPreset } from '../utils/AvatarPresets';
import { getPlayerAvatarUrl } from '../pocketbase';

interface PlayerAvatarProps {
  name: string;
  avatar?: string;
  userId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PlayerAvatar({
  name,
  avatar,
  userId,
  className = 'player-avatar',
  style,
}: PlayerAvatarProps) {
  if (avatar && avatar.startsWith('preset_')) {
    const preset = getAvatarPreset(avatar);
    if (preset) {
      return (
        <div
          className={`${className} preset-avatar`}
          style={{
            background: preset.gradient,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            userSelect: 'none',
            ...style,
          }}
        >
          {preset.emoji}
        </div>
      );
    }
  }

  if (avatar && userId) {
    const url = getPlayerAvatarUrl(userId, avatar);
    if (url) {
      return (
        <img
          src={url}
          alt={name}
          className={className}
          style={{ objectFit: 'cover', ...style }}
        />
      );
    }
  }

  // Fallback to first letter
  const firstLetter = name ? name[0].toUpperCase() : '?';
  return (
    <div
      className={`${className} fallback-avatar`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
        color: 'white',
        fontWeight: 'bold',
        ...style,
      }}
    >
      {firstLetter}
    </div>
  );
}
