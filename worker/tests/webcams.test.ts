import { describe, expect, it } from 'vitest';
import { parseCoords, parseWindyWebcams, windyUrl } from '../src/webcams';

const windyCam = (over: Record<string, unknown> = {}) => ({
  webcamId: 1234567890,
  status: 'active',
  title: 'Montréal: Old Port',
  lastUpdatedOn: '2026-08-05T14:05:00.000Z',
  images: {
    current: {
      icon: 'https://images.windy.com/icon.jpg?t=abc',
      thumbnail: 'https://images.windy.com/thumb.jpg?t=abc',
      preview: 'https://images.windy.com/preview.jpg?t=abc',
    },
  },
  location: {
    city: 'Montréal',
    region: 'Québec',
    latitude: 45.5,
    longitude: -73.55,
  },
  player: {
    live: 'https://webcams.windy.com/webcams/public/embed/player/1234567890/live',
    day: 'https://webcams.windy.com/webcams/public/embed/player/1234567890/day',
  },
  urls: { detail: 'https://windy.com/webcams/1234567890' },
  ...over,
});

describe('parseWindyWebcams', () => {
  it('maps a v3 webcam to the slim shape', () => {
    const cams = parseWindyWebcams({ total: 1, webcams: [windyCam()] });
    expect(cams).toHaveLength(1);
    expect(cams[0]).toEqual({
      id: 1234567890,
      title: 'Montréal: Old Port',
      lat: 45.5,
      lon: -73.55,
      place: 'Montréal, Québec',
      thumb: 'https://images.windy.com/thumb.jpg?t=abc',
      preview: 'https://images.windy.com/preview.jpg?t=abc',
      live: 'https://webcams.windy.com/webcams/public/embed/player/1234567890/live',
      day: 'https://webcams.windy.com/webcams/public/embed/player/1234567890/day',
      detail: 'https://windy.com/webcams/1234567890',
      updated: '2026-08-05T14:05:00.000Z',
    });
  });

  it('omits live when the cam has no live player', () => {
    const cams = parseWindyWebcams({
      webcams: [windyCam({ player: { day: 'https://example.com/day' } })],
    });
    expect(cams[0]!.live).toBeUndefined();
    expect(cams[0]!.day).toBe('https://example.com/day');
  });

  it('drops inactive cams and cams missing coordinates or images', () => {
    const noLoc = windyCam({ location: { city: 'X' } });
    const noImg = windyCam({ images: {} });
    const inactive = windyCam({ status: 'inactive' });
    expect(parseWindyWebcams({ webcams: [noLoc, noImg, inactive, windyCam()] })).toHaveLength(1);
  });

  it('falls back to thumbnail when preview is missing', () => {
    const cam = windyCam({
      images: { current: { thumbnail: 'https://x/t.jpg' } },
    });
    expect(parseWindyWebcams({ webcams: [cam] })[0]!.preview).toBe('https://x/t.jpg');
  });

  it('survives garbage input', () => {
    expect(parseWindyWebcams(null)).toEqual([]);
    expect(parseWindyWebcams({})).toEqual([]);
    expect(parseWindyWebcams({ webcams: [null, 42, 'x'] })).toEqual([]);
  });
});

describe('parseCoords', () => {
  const at = (q: string) => parseCoords(new URL(`https://w.example/api/webcams?${q}`));
  it('accepts valid coordinates', () => {
    expect(at('lat=45.5&lon=-73.55')).toEqual({ lat: 45.5, lon: -73.55 });
  });
  it('rejects missing or out-of-range values', () => {
    expect(at('lat=45.5')).toBeNull();
    expect(at('lat=abc&lon=1')).toBeNull();
    expect(at('lat=91&lon=0')).toBeNull();
    expect(at('lat=0&lon=181')).toBeNull();
  });
});

describe('windyUrl', () => {
  it('targets the v3 nearby search with the needed includes', () => {
    const u = windyUrl(45.5, -73.55);
    expect(u).toContain('https://api.windy.com/webcams/api/v3/webcams');
    expect(u).toContain('nearby=45.5,-73.55,');
    expect(u).toContain('include=images,location,player,urls');
  });
});
