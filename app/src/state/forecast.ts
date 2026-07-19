import { create } from 'zustand';
import type { ForecastData } from '../core/forecast';
import { fetchForecast } from '../services/openMeteo';
import type { Place } from './settings';

export interface ForecastState {
  data: ForecastData | null;
  /** Coordinates the loaded data belongs to. */
  dataFor: Place | null;
  updatedAt: number | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  load: (loc: Place) => Promise<void>;
}

let generation = 0; // drop out-of-date responses when the location changes mid-fetch

export const useForecast = create<ForecastState>()((set) => ({
  data: null,
  dataFor: null,
  updatedAt: null,
  status: 'idle',
  error: null,

  load: async (loc) => {
    const gen = ++generation;
    set({ status: 'loading', error: null });
    try {
      const data = await fetchForecast(loc.lat, loc.lon);
      if (gen !== generation) return; // a newer fetch superseded this one
      set({ data, dataFor: loc, updatedAt: Date.now(), status: 'ready' });
    } catch (err) {
      if (gen !== generation) return;
      set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  },
}));
