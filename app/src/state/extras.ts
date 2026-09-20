// Best-effort side data for the Today page: air quality and official
// weather alerts, from whichever national service covers the point (the
// NWS in the US, ECCC everywhere else, as before the US launch). Failures
// degrade silently — the page renders without the tile/banner.

import { create } from 'zustand';
import { inUsa } from '../core/region';
import { fetchAirQuality, type AirQuality } from '../services/airQuality';
import { fetchEcccAlerts, type WeatherAlert } from '../services/eccc';
import { fetchNwsAlerts } from '../services/nws';
import type { Place } from './settings';

export interface ExtrasState {
  aqhi: AirQuality | null;
  alerts: WeatherAlert[];
  load: (loc: Place) => Promise<void>;
}

let generation = 0;

export const useExtras = create<ExtrasState>()((set) => ({
  aqhi: null,
  alerts: [],

  load: async (loc) => {
    const gen = ++generation;
    const [aqhi, alerts] = await Promise.all([
      fetchAirQuality(loc.lat, loc.lon),
      inUsa(loc.lat, loc.lon) ? fetchNwsAlerts(loc.lat, loc.lon) : fetchEcccAlerts(loc.lat, loc.lon),
    ]);
    if (gen !== generation) return; // superseded by a newer location
    set({ aqhi, alerts });
  },
}));
