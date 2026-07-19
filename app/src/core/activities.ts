// Activity presets — weights 0–10 per risk factor, comfort band in °C.
// windIdeal (sailing): too little wind is ALSO a risk.
// snowBase (winter sports): metres of snow cover below which risk rises.

export const ACTIVITY_IDS = [
  'tennis',
  'cycling',
  'jogging',
  'fishing',
  'golf',
  'hiking',
  'sailing',
  'picnic',
  'skiing',
  'snowmob',
  'motorcycle',
  'utv',
  'waterski',
  'pontoon',
  'pickleball',
] as const;

export type PresetActivityId = (typeof ACTIVITY_IDS)[number];

/** Any activity id: a preset id or a user-created one ("c-…"). */
export type ActivityId = string;

// Categories group the rail; CATEGORY_IDS order is the base display order.
export const CATEGORY_IDS = ['powersports', 'trail', 'water', 'court', 'snow', 'leisure'] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** 'winter'/'warm' activities go off-season half the year; 'all' never do. */
export type Season = 'winter' | 'warm' | 'all';

export const FACTOR_KEYS = ['rain', 'wind', 'cold', 'heat', 'uv', 'snow', 'fresh'] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];
export type Weights = Record<FactorKey, number>;

export interface ActivityPreset {
  emoji: string;
  /** A preset category, or any user-typed label for custom categories. */
  cat: CategoryId | (string & {});
  season: Season;
  w: Weights;
  tMin: number;
  tMax: number;
  /** km/h band [lo, hi]: below lo is as bad as above hi (sailing). */
  windIdeal?: readonly [number, number];
  /** Metres of snow cover under which the ground is considered bare. */
  snowBase?: number;
}

const w = (
  rain: number,
  wind: number,
  cold: number,
  heat: number,
  uv: number,
  snow = 0,
  fresh = 0,
): Weights => ({ rain, wind, cold, heat, uv, snow, fresh });

export const ACTIVITIES: Record<PresetActivityId, ActivityPreset> = {
  tennis: { emoji: '🎾', cat: 'court', season: 'warm', w: w(10, 6, 4, 5, 3), tMin: 10, tMax: 30 },
  cycling: { emoji: '🚴', cat: 'trail', season: 'all', w: w(8, 8, 6, 5, 4), tMin: 5, tMax: 32 },
  jogging: { emoji: '🏃', cat: 'trail', season: 'all', w: w(5, 3, 4, 8, 5), tMin: 0, tMax: 26 },
  fishing: { emoji: '🎣', cat: 'water', season: 'all', w: w(2, 9, 5, 3, 4), tMin: 2, tMax: 32 },
  golf: { emoji: '⛳', cat: 'court', season: 'warm', w: w(9, 6, 5, 4, 4), tMin: 8, tMax: 31 },
  hiking: { emoji: '🥾', cat: 'trail', season: 'all', w: w(6, 5, 6, 6, 6), tMin: 2, tMax: 28 },
  sailing: {
    emoji: '⛵',
    cat: 'water',
    season: 'warm',
    w: w(3, 8, 5, 2, 5),
    tMin: 5,
    tMax: 33,
    windIdeal: [9, 32],
  },
  picnic: { emoji: '🧺', cat: 'leisure', season: 'warm', w: w(9, 5, 6, 4, 3), tMin: 15, tMax: 32 },
  skiing: {
    emoji: '⛷️',
    cat: 'snow',
    season: 'winter',
    w: w(7, 6, 6, 6, 5, 9, 3),
    tMin: -18,
    tMax: 6,
    snowBase: 0.2,
  },
  snowmob: {
    emoji: '🛷',
    cat: 'powersports',
    season: 'winter',
    w: w(6, 5, 5, 7, 3, 10, 2),
    tMin: -25,
    tMax: 4,
    snowBase: 0.15,
  },
  motorcycle: {
    emoji: '🏍️',
    cat: 'powersports',
    season: 'warm',
    w: w(10, 7, 6, 4, 5),
    tMin: 8,
    tMax: 35,
  },
  utv: { emoji: '🛻', cat: 'powersports', season: 'all', w: w(5, 3, 5, 5, 5), tMin: -5, tMax: 33 },
  waterski: {
    emoji: '🚤',
    cat: 'water',
    season: 'warm',
    w: w(6, 8, 7, 2, 6),
    tMin: 18,
    tMax: 36,
  },
  pontoon: { emoji: '⛴️', cat: 'water', season: 'warm', w: w(8, 7, 6, 3, 6), tMin: 15, tMax: 34 },
  pickleball: {
    emoji: '🏓',
    cat: 'court',
    season: 'warm',
    w: w(10, 8, 4, 5, 3),
    tMin: 8,
    tMax: 30,
  },
};

export const TOL_MULT = { cautious: 1.3, balanced: 1.0, tolerant: 0.68 } as const;
export type Tolerance = keyof typeof TOL_MULT;

/** A user-created activity: a full preset plus its id and display name. */
export interface CustomActivity extends ActivityPreset {
  id: string;
  name: string;
}

/** Starting criteria for a user-created activity — deliberately middle-of-the-road. */
export function newCustomActivity(input: {
  name: string;
  emoji: string;
  cat: string;
  season: Season;
}): CustomActivity {
  const winter = input.season === 'winter';
  return {
    id: `c-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
    name: input.name,
    emoji: input.emoji,
    cat: input.cat,
    season: input.season,
    w: winter ? w(6, 5, 5, 6, 3, 8, 2) : w(7, 5, 5, 5, 4),
    tMin: winter ? -20 : 5,
    tMax: winter ? 5 : 30,
    ...(winter ? { snowBase: 0.15 } : {}),
  };
}

/** Neutral stand-in when an id resolves to nothing (e.g. a deleted custom
 * activity still referenced by a planned session). */
const GENERIC_ACT: ActivityPreset = {
  emoji: '🏅',
  cat: 'leisure',
  season: 'all',
  w: w(7, 5, 5, 5, 4),
  tMin: 5,
  tMax: 30,
};

/** Resolve any activity id — presets first, then the user's custom list. */
export const actOf = (
  id: ActivityId,
  customs?: readonly CustomActivity[],
): ActivityPreset | undefined =>
  (ACTIVITIES as Record<string, ActivityPreset | undefined>)[id] ??
  customs?.find((c) => c.id === id);

export const isWinterActivity = (id: ActivityId, customs?: readonly CustomActivity[]): boolean =>
  actOf(id, customs)?.snowBase != null;

/** Everything the scoring engine needs to judge one activity. */
export interface Criteria {
  act: ActivityPreset;
  weights: Weights;
  tMin: number;
  tMax: number;
}

/** Criteria from the preset (or custom activity), overridden by saved user tuning. */
export function criteriaFrom(
  id: ActivityId,
  tune?: { w?: Partial<Weights>; tMin?: number; tMax?: number },
  customs?: readonly CustomActivity[],
): Criteria {
  const act = actOf(id, customs) ?? GENERIC_ACT;
  const tMin = tune?.tMin;
  const tMax = tune?.tMax;
  return {
    act,
    weights: { ...act.w, ...tune?.w },
    tMin: typeof tMin === 'number' && Number.isFinite(tMin) ? tMin : act.tMin,
    tMax: typeof tMax === 'number' && Number.isFinite(tMax) ? tMax : act.tMax,
  };
}
