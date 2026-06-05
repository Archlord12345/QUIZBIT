import React, { useMemo, useState } from 'react';
import { getInitials, resolveAvatarUrl } from './defaultAvatar.js';

export function AvatarBadge({
  avatarUrl,
  seed,
  displayName = 'Player',
  size = 36,
  showLabel = false,
}) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(
    () => resolveAvatarUrl(avatarUrl, seed, displayName),
    [avatarUrl, seed, displayName],
  );
  const initials = getInitials(displayName);

  return (
    <div className="avatar-badge" style={{ '--avatar-size': `${size}px` }}>
      {failed ? (
        <span className="avatar-badge-fallback" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <img
          alt={`Avatar de ${displayName}`}
          className="avatar-badge-image"
          crossOrigin="anonymous"
          height={size}
          loading="lazy"
          onError={() => setFailed(true)}
          referrerPolicy="no-referrer"
          src={uri}
          width={size}
        />
      )}
      {showLabel ? <span className="avatar-badge-name">{displayName}</span> : null}
    </div>
  );
}
