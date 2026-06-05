const DEFAULT_AVATAR_HOSTS = new Set([
  'ui-avatars.com',
  'api.dicebear.com',
]);

const BRAND_COLORS = ['7a317a', '5b2861', 'ee6845', '4a204e'];

const hashSeed = value => {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const buildDefaultAvatarUrl = (seed, displayName = 'Player') => {
  const name = String(displayName || 'Player').trim() || 'Player';
  const stableSeed = String(seed || name).trim() || name;
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

const isDefaultAvatarUrl = url => {
  try {
    const host = new URL(String(url || '').trim()).hostname.toLowerCase();
    return DEFAULT_AVATAR_HOSTS.has(host);
  } catch {
    return false;
  }
};

const resolveAvatarUrl = (avatarUrl, seed, displayName = 'Player') => {
  const clean = String(avatarUrl || '').trim();
  if (clean && !isDefaultAvatarUrl(clean)) {
    return clean;
  }
  return buildDefaultAvatarUrl(seed, displayName);
};

const hasCustomAvatar = avatarUrl => {
  const clean = String(avatarUrl || '').trim();
  if (!clean) return false;
  return !isDefaultAvatarUrl(clean);
};

module.exports = {
  buildDefaultAvatarUrl,
  hasCustomAvatar,
  isDefaultAvatarUrl,
  resolveAvatarUrl,
};
