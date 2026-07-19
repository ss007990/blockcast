// User-created activities: id resolution, criteria fallback, season grouping.

import { describe, expect, it } from 'vitest';
import {
  actOf,
  criteriaFrom,
  isWinterActivity,
  newCustomActivity,
  type CustomActivity,
} from '../src/core/activities';
import { groupActivities, inSeason, orderActivities } from '../src/core/season';

const kayak = { ...newCustomActivity({ name: 'Kayak', emoji: '🛶', cat: 'Paddle', season: 'warm' }), id: 'c-kayak' };
const sled: CustomActivity = {
  ...newCustomActivity({ name: 'Sledding', emoji: '🛷', cat: 'snow', season: 'winter' }),
  id: 'c-sled',
};

describe('custom activities', () => {
  it('newCustomActivity gives winter activities a snow base and cold band', () => {
    expect(sled.snowBase).toBeGreaterThan(0);
    expect(sled.tMin).toBeLessThan(0);
    expect(sled.w.snow).toBeGreaterThan(0);
    expect(kayak.snowBase).toBeUndefined();
    expect(isWinterActivity('c-sled', [sled])).toBe(true);
    expect(isWinterActivity('c-kayak', [kayak])).toBe(false);
  });

  it('actOf resolves presets first, then customs', () => {
    expect(actOf('tennis')?.cat).toBe('court');
    expect(actOf('c-kayak', [kayak])?.emoji).toBe('🛶');
    expect(actOf('c-gone', [kayak])).toBeUndefined();
  });

  it('criteriaFrom uses the custom activity and honours tuning', () => {
    const crit = criteriaFrom('c-kayak', { tMin: 12, w: { wind: 9 } }, [kayak]);
    expect(crit.act).toBe(kayak);
    expect(crit.tMin).toBe(12);
    expect(crit.weights.wind).toBe(9);
    expect(crit.weights.rain).toBe(kayak.w.rain);
  });

  it('criteriaFrom falls back to a neutral preset for unknown ids', () => {
    const crit = criteriaFrom('c-deleted', { tMax: 21 });
    expect(crit.tMax).toBe(21);
    expect(crit.weights.rain).toBeGreaterThan(0);
  });

  it('custom cat joins the rail as its own group; preset cat merges in', () => {
    const groups = groupActivities(false, [kayak, sled]);
    const paddle = groups.find((g) => g.cat === 'Paddle')!;
    expect(paddle.inSeason).toEqual(['c-kayak']);
    const snow = groups.find((g) => g.cat === 'snow')!;
    expect(snow.offSeason).toContain('c-sled');
    // winter flips them
    const winter = groupActivities(true, [kayak, sled]);
    expect(winter.find((g) => g.cat === 'snow')!.inSeason).toContain('c-sled');
    expect(winter.find((g) => g.cat === 'Paddle')!.offSeason).toEqual(['c-kayak']);
  });

  it('inSeason and orderActivities keep every custom activity', () => {
    expect(inSeason('c-kayak', false, [kayak])).toBe(true);
    expect(inSeason('c-kayak', true, [kayak])).toBe(false);
    const all = orderActivities(true, [kayak, sled]);
    expect(all).toContain('c-kayak');
    expect(all).toContain('c-sled');
  });
});
