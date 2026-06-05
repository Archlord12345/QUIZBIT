import { GameMode } from '../controllers/ScoreController';

const MONTH_NAMES_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
] as const;

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Clé de saison mensuelle : `YYYY-MM` */
export const getSeasonKey = (value: string | Date = new Date()): string => {
  const date = toDate(value) || new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const getSeasonLabel = (
  seasonKey: string = getSeasonKey(),
): string => {
  const [yearText, monthText] = seasonKey.split('-');
  const monthIndex = Number(monthText) - 1;
  const year = Number(yearText);
  if (
    !yearText ||
    !monthText ||
    monthIndex < 0 ||
    monthIndex >= MONTH_NAMES_FR.length ||
    Number.isNaN(year)
  ) {
    return getSeasonLabel(getSeasonKey());
  }
  return `${MONTH_NAMES_FR[monthIndex]} ${year}`;
};

export const getCurrentSeasonLabel = (): string => getSeasonLabel(getSeasonKey());

export const isDateInSeason = (
  createdAt: string | Date | null | undefined,
  seasonKey: string = getSeasonKey(),
): boolean => {
  const date = toDate(createdAt);
  if (!date) return false;
  return getSeasonKey(date) === seasonKey;
};

export const buildSeasonBadgeLabel = (mode?: GameMode): string => {
  const monthLabel = getCurrentSeasonLabel();
  if (mode === 'battle_royale') return `Battle · ${monthLabel}`;
  if (mode === 'solo') return `Solo · ${monthLabel}`;
  return monthLabel;
};

type ScoreLike = {
  userId: string;
  score: number;
  createdAt?: string;
};

/** Meilleur score par joueur pour une saison mensuelle. */
export const rankBestScoresForSeason = <T extends ScoreLike>(
  scores: T[],
  seasonKey: string = getSeasonKey(),
): T[] => {
  const bestByUser = new Map<string, T>();

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
