// Which country's weather service a point belongs to, and what a first-run
// user expects to read. The NWS rejects points outside the US, so every
// sizeable city on either side of the border has to land on its own side.

import { describe, expect, it } from 'vitest';
import { countryOf, detectClock, detectUnits, inCanada, inUsa, regionOf } from '../src/core/region';

describe('countryOf', () => {
  const ca = (lat: number, lon: number) => expect(countryOf(lat, lon)).toBe('CA');
  const us = (lat: number, lon: number) => expect(countryOf(lat, lon)).toBe('US');

  it('keeps Canada Canadian, including the cities that sit south of 49°N', () => {
    ca(46.81, -71.21); // Québec
    ca(45.5, -73.57); // Montréal
    ca(45.42, -75.7); // Ottawa
    ca(43.65, -79.38); // Toronto
    ca(43.26, -79.87); // Hamilton
    ca(43.45, -79.68); // Oakville
    ca(42.98, -81.25); // London ON
    ca(42.97, -82.4); // Sarnia
    ca(44.23, -76.48); // Kingston
    ca(45.4, -71.9); // Sherbrooke
    ca(46.52, -84.35); // Sault Ste. Marie ON
    ca(48.38, -89.25); // Thunder Bay
    ca(49.9, -97.14); // Winnipeg
    ca(49.28, -123.12); // Vancouver
    ca(48.43, -123.37); // Victoria
    ca(53.55, -113.49); // Edmonton
    ca(60.72, -135.05); // Whitehorse
    ca(54.32, -130.32); // Prince Rupert
    ca(47.37, -68.33); // Edmundston
    ca(45.96, -66.64); // Fredericton
    ca(47.56, -52.71); // St. John's
    ca(63.75, -68.52); // Iqaluit
  });

  it('keeps the US American, including the cities that sit north of 41.6°N', () => {
    us(40.71, -74.01); // New York
    us(42.36, -71.06); // Boston
    us(44.48, -73.21); // Burlington VT
    us(44.7, -73.45); // Plattsburgh
    us(43.16, -77.61); // Rochester
    us(43.45, -76.51); // Oswego
    us(42.89, -78.88); // Buffalo
    us(42.13, -80.09); // Erie
    us(42.33, -83.05); // Detroit
    us(41.88, -87.63); // Chicago
    us(44.98, -93.27); // Minneapolis
    us(46.79, -92.1); // Duluth
    us(47.12, -88.57); // Houghton MI
    us(46.55, -87.4); // Marquette MI
    us(48.12, -123.43); // Port Angeles
    us(47.61, -122.33); // Seattle
    us(46.68, -68.02); // Presque Isle
    us(46.13, -67.84); // Houlton
    us(44.8, -68.78); // Bangor
    us(25.76, -80.19); // Miami
    us(32.72, -117.16); // San Diego
    us(31.76, -106.49); // El Paso
    us(27.5, -99.5); // Laredo
    us(25.9, -97.5); // Brownsville
    us(24.56, -81.78); // Key West
    us(32.22, -110.97); // Tucson
    us(61.22, -149.9); // Anchorage
    us(58.3, -134.42); // Juneau
    us(55.34, -131.65); // Ketchikan
    us(21.31, -157.86); // Honolulu
    us(18.47, -66.11); // San Juan
  });

  it('leaves the rest of the world to neither', () => {
    expect(countryOf(48.86, 2.35)).toBeNull(); // Paris
    expect(countryOf(19.43, -99.13)).toBeNull(); // Mexico City
    expect(countryOf(32.53, -117.04)).toBeNull(); // Tijuana
    expect(countryOf(31.3, -110.94)).toBeNull(); // Nogales, Sonora
    expect(countryOf(25.68, -100.31)).toBeNull(); // Monterrey
    expect(countryOf(64.15, -21.94)).toBeNull(); // Reykjavík
    expect(inUsa(48.86, 2.35)).toBe(false);
    expect(inCanada(48.86, 2.35)).toBe(false);
  });
});

describe('locale defaults', () => {
  it('reads the region subtag', () => {
    expect(regionOf('en-US')).toBe('US');
    expect(regionOf('fr-CA')).toBe('CA');
    expect(regionOf('en_us')).toBe('US');
    expect(regionOf('fr')).toBe('');
    expect(regionOf(undefined)).toBe('');
  });

  it('gives Americans °F and a 12 h clock, everyone else metric and 24 h', () => {
    expect(detectUnits('en-US')).toBe('imperial');
    expect(detectClock('en-US')).toBe('12h');
    expect(detectUnits('en-CA')).toBe('metric');
    expect(detectClock('en-CA')).toBe('24h');
    expect(detectUnits('fr-CA')).toBe('metric');
    expect(detectUnits('en-GB')).toBe('metric');
    expect(detectUnits(undefined)).toBe('metric');
    expect(detectClock(undefined)).toBe('24h');
  });
});
