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
] as const;

export type ActivityId = (typeof ACTIVITY_IDS)[number];

export const FACTOR_KEYS = ['rain', 'wind', 'cold', 'heat', 'uv', 'snow', 'fresh'] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];
export type Weights = Record<FactorKey, number>;

export interface ActivityPreset {
  emoji: string;
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

export const ACTIVITIES: Record<ActivityId, ActivityPreset> = {
  tennis: { emoji: '🎾', w: w(10, 6, 4, 5, 3), tMin: 10, tMax: 30 },
  cycling: { emoji: '🚴', w: w(8, 8, 6, 5, 4), tMin: 5, tMax: 32 },
  jogging: { emoji: '🏃', w: w(5, 3, 4, 8, 5), tMin: 0, tMax: 26 },
  fishing: { emoji: '🎣', w: w(2, 9, 5, 3, 4), tMin: 2, tMax: 32 },
  golf: { emoji: '⛳', w: w(9, 6, 5, 4, 4), tMin: 8, tMax: 31 },
  hiking: { emoji: '🥾', w: w(6, 5, 6, 6, 6), tMin: 2, tMax: 28 },
  sailing: { emoji: '⛵', w: w(3, 8, 5, 2, 5), tMin: 5, tMax: 33, windIdeal: [9, 32] },
  picnic: { emoji: '🧺', w: w(9, 5, 6, 4, 3), tMin: 15, tMax: 32 },
  skiing: { emoji: '⛷️', w: w(7, 6, 6, 6, 5, 9, 3), tMin: -18, tMax: 6, snowBase: 0.2 },
  snowmob: { emoji: '🛷', w: w(6, 5, 5, 7, 3, 10, 2), tMin: -25, tMax: 4, snowBase: 0.15 },
};

export const TOL_MULT = { cautious: 1.3, balanced: 1.0, tolerant: 0.68 } as const;
export type Tolerance = keyof typeof TOL_MULT;

export const isWinterActivity = (id: ActivityId): boolean => ACTIVITIES[id].snowBase != null;

/** Everything the scoring engine needs to judge one activity. */
export interface Criteria {
  act: ActivityPreset;
  weights: Weights;
  tMin: number;
  tMax: number;
}

/** Criteria from the preset, optionally overridden by saved user tuning. */
export function criteriaFrom(
  id: ActivityId,
  tune?: { w?: Partial<Weights>; tMin?: number; tMax?: number },
): Criteria {
  const act = ACTIVITIES[id];
  const tMin = tune?.tMin;
  const tMax = tune?.tMax;
  return {
    act,
    weights: { ...act.w, ...tune?.w },
    tMin: typeof tMin === 'number' && Number.isFinite(tMin) ? tMin : act.tMin,
    tMax: typeof tMax === 'number' && Number.isFinite(tMax) ? tMax : act.tMax,
  };
}
