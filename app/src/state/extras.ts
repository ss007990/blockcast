// Best-effort side data for the Today page: AQHI and ECCC weather alerts.
// Failures degrade silently — the page renders without the tile/banner.

import { create } from 'zustand';
import { fetchAqhi, type AirQuality } from '../services/airQuality';
import { fetchEcccAlerts, type EcccAlert } from '../services/eccc';
import type { Place } from './settings';

export interface ExtrasState {
  aqhi: AirQuality | null;
  alerts: EcccAlert[];
  load: (loc: Place) => Promise<void>;
}

let generation = 0;

export const useExtras = create<ExtrasState>()((set) => ({
  aqhi: null,
  alerts: [],

  load: async (loc) => {
    const gen = ++generation;
    const [aqhi, alerts] = await Promise.all([
      fetchAqhi(loc.lat, loc.lon),
      fetchEcccAlerts(loc.lat, loc.lon),
    ]);
    if (gen !== generation) return; // superseded by a newer location
    set({ aqhi, alerts });
  },
}));
