const MONTH_NAMES_FR = [
  'Janvier',
  'Fevrier',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Aout',
  'Septembre',
  'Octobre',
  'Novembre',
  'Decembre',
];

const toDate = value => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSeasonKey = (value = new Date()) => {
  const date = toDate(value) || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const isDateInSeason = (createdAt, seasonKey = getSeasonKey()) => {
  const date = toDate(createdAt);
  if (!date) return false;
  return getSeasonKey(date) === seasonKey;
};

const rankBestScoresForSeason = (scores, seasonKey = getSeasonKey()) => {
  const bestByUser = new Map();
  for (const entry of scores) {
    if (!isDateInSeason(entry.createdAt, seasonKey)) continue;
    const existing = bestByUser.get(entry.userId);
    if (!existing || Number(entry.score) > Number(existing.score)) {
      bestByUser.set(entry.userId, entry);
    }
  }
  return Array.from(bestByUser.values()).sort(
    (left, right) => Number(right.score) - Number(left.score),
  );
};

module.exports = {
  getSeasonKey,
  isDateInSeason,
  rankBestScoresForSeason,
};
