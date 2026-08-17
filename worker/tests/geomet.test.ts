import { describe, expect, it } from 'vitest';
import { geometMapUrl, parseGeometCapsPath, parseGeometMapPath } from '../src/geomet';

const OBS = 'RADAR_1KM_RRAI';
const T = '2026-08-17T13:54:00Z';
const path = (extra = `${OBS}/${T}/9/140/180/4/6`) => `/api/geomet/map/${extra}.png`;

describe('parseGeometMapPath', () => {
  it('parses a valid frame request', () => {
    expect(parseGeometMapPath(path())).toEqual({
      layer: OBS,
      time: T,
      z: 9,
      x0: 140,
      y0: 180,
      nx: 4,
      ny: 6,
    });
  });

  it('accepts the nowcast and model layers', () => {
    for (const l of ['Radar_1km_RainPrecipRate-Extrapolation', 'HRDPS.CONTINENTAL_RT']) {
      expect(parseGeometMapPath(path(`${l}/${T}/9/140/180/4/6`))?.layer).toBe(l);
    }
  });

  it('refuses to forward layers the player does not play', () => {
    expect(parseGeometMapPath(path(`HRDPS.CONTINENTAL_PR/${T}/9/140/180/4/6`))).toBeNull();
    expect(parseGeometMapPath(path(`GDPS.ETA_TT/${T}/9/140/180/4/6`))).toBeNull();
  });

  it('requires a whole-second UTC time', () => {
    expect(parseGeometMapPath(path(`${OBS}/2026-08-17T13:54:00.000Z/9/140/180/4/6`))).toBeNull();
    expect(parseGeometMapPath(path(`${OBS}/2026-08-17T13:54Z/9/140/180/4/6`))).toBeNull();
    expect(parseGeometMapPath(path(`${OBS}/2026-13-40T99:99:99Z/9/140/180/4/6`))).toBeNull();
  });

  it('rejects rectangles outside the grid or over the size cap', () => {
    expect(parseGeometMapPath(path(`${OBS}/${T}/2/3/0/2/1`))).toBeNull(); // overruns 2^2
    expect(parseGeometMapPath(path(`${OBS}/${T}/9/140/180/9/1`))).toBeNull(); // 9 cells wide
    expect(parseGeometMapPath(path(`${OBS}/${T}/13/1/1/1/1`))).toBeNull(); // zoom too deep
  });

  it('rejects anything that is not a frame path', () => {
    expect(parseGeometMapPath(`/api/geomet/map/${OBS}/${T}/9/140/180/4/6.jpg`)).toBeNull();
    expect(parseGeometMapPath('/api/geomet/caps/RADAR_1KM_RRAI')).toBeNull();
    expect(parseGeometMapPath('/api/geomet/map/../../etc/passwd')).toBeNull();
  });
});

describe('parseGeometCapsPath', () => {
  it('accepts the allowlisted layers only', () => {
    expect(parseGeometCapsPath(`/api/geomet/caps/${OBS}`)).toBe(OBS);
    expect(parseGeometCapsPath('/api/geomet/caps/GDPS.ETA_TT')).toBeNull();
    expect(parseGeometCapsPath('/api/geomet/caps/')).toBeNull();
  });
});

describe('geometMapUrl', () => {
  const p = parseGeometMapPath(path())!;
  const url = new URL(geometMapUrl(p));

  it('asks GeoMet for the bbox the cell rectangle describes', () => {
    expect(url.origin + url.pathname).toBe('https://geo.weather.gc.ca/geomet');
    const bbox = url.searchParams.get('bbox')!.split(',').map(Number);
    expect(bbox).toHaveLength(4);
    expect(bbox[0]).toBeLessThan(bbox[2]!); // xmin < xmax
    expect(bbox[1]).toBeLessThan(bbox[3]!); // ymin < ymax
  });

  it('sizes the image at 256 px per cell', () => {
    expect(url.searchParams.get('width')).toBe('1024');
    expect(url.searchParams.get('height')).toBe('1536');
  });

  it('passes the validated layer and time through unchanged', () => {
    expect(url.searchParams.get('layers')).toBe(OBS);
    expect(url.searchParams.get('time')).toBe(T);
    expect(url.searchParams.get('crs')).toBe('EPSG:3857');
    expect(url.searchParams.get('request')).toBe('GetMap');
  });
});
