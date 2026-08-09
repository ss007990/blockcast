import { describe, expect, it } from 'vitest';
import { parseRimgPath } from '../src/rimg';

describe('parseRimgPath', () => {
  const ok = (p: string) => parseRimgPath(p);

  it('parses a valid radar image path', () => {
    expect(ok('/api/rimg/radar/700x420/46.81,-71.21,8/current.png')).toEqual({
      layer: 'radar',
      w: 700,
      h: 420,
      lat: 46.81,
      lon: -71.21,
      z: 8,
      offset: 'current',
    });
  });

  it('parses fradar with signed offsets', () => {
    expect(ok('/api/rimg/fradar/1400x840/46.81,-71.21,9/+30min.png')?.offset).toBe('+30min');
    expect(ok('/api/rimg/radar/700x420/46.81,-71.21,8/-60min.png')?.offset).toBe('-60min');
  });

  it('rejects unknown layers and malformed offsets', () => {
    expect(ok('/api/rimg/stormcells/700x420/46.8,-71.2,8/current.png')).toBeNull();
    expect(ok('/api/rimg/radar/700x420/46.8,-71.2,8/tomorrow.png')).toBeNull();
    expect(ok('/api/rimg/radar/700x420/46.8,-71.2,8/+9999min.png')).toBeNull();
  });

  it('rejects oversized images and out-of-range coordinates', () => {
    expect(ok('/api/rimg/radar/9000x420/46.8,-71.2,8/current.png')).toBeNull();
    expect(ok('/api/rimg/radar/700x420/96.8,-71.2,8/current.png')).toBeNull();
    expect(ok('/api/rimg/radar/700x420/46.8,-191.2,8/current.png')).toBeNull();
    expect(ok('/api/rimg/radar/700x420/46.8,-71.2,15/current.png')).toBeNull();
  });

  it('rejects paths with extra or missing segments', () => {
    expect(ok('/api/rimg/radar/700x420/46.8,-71.2,8/current.jpg')).toBeNull();
    expect(ok('/api/rimg/radar/46.8,-71.2,8/current.png')).toBeNull();
    expect(ok('/api/rimg/radar/700x420/46.8,-71.2,8/current.png/extra')).toBeNull();
  });
});
