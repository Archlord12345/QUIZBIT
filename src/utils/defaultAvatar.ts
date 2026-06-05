const BRAND_COLORS = ['7a317a', '5b2861', 'ee6845', '4a204e'];

const hashSeed = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const buildDefaultAvatarUrl = (
  seed: string,
  displayName = 'Player',
) => {
  const name = displayName.trim() || 'Player';
  const stableSeed = seed.trim() || name;
  const background = BRAND_COLORS[hashSeed(stableSeed) % BRAND_COLORS.length];
  const params = new URLSearchParams({
    name,
    background,
    color: 'ffffff',
    size: '256',
    bold: 'true',
  });
  return `https://ui-avatars.com/api/?${params.toString()}`;
};

export const isDefaultAvatarUrl = (url?: string) => {
  const clean = String(url || '').trim();
  if (!clean) return true;
  try {
    const host = new URL(clean).hostname.toLowerCase();
    return host === 'ui-avatars.com' || host === 'api.dicebear.com';
  } catch {
    return false;
  }
};

export const resolveAvatarUrl = (
  avatarUrl: string | undefined,
  seed: string,
  displayName = 'Player',
) => {
  const clean = String(avatarUrl || '').trim();
  if (clean && !isDefaultAvatarUrl(clean)) {
    return clean;
  }
  return buildDefaultAvatarUrl(seed, displayName);
};

export const hasCustomAvatar = (avatarUrl?: string) => {
  const clean = String(avatarUrl || '').trim();
  if (!clean) return false;
  return !isDefaultAvatarUrl(clean);
};

export const getInitials = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
