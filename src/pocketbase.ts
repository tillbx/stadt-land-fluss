import PocketBase from 'pocketbase';

// Determine PocketBase URL dynamically based on the current window location
const getPocketBaseUrl = (): string => {
  if (import.meta.env.VITE_POCKETBASE_URL) {
    return import.meta.env.VITE_POCKETBASE_URL;
  }
  // Use same origin (same domain & port) to route requests through Vite's dev server proxy or same production host
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8090';
};

export const pb = new PocketBase(getPocketBaseUrl());

export const getPlayerAvatarUrl = (userId: string, avatarFilename: string): string => {
  if (!userId || !avatarFilename) return '';
  return pb.files.getUrl({ id: userId, collectionName: 'users', avatar: avatarFilename } as any, avatarFilename);
};

