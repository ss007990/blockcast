import { create } from 'zustand';
import type { ForecastData } from '../core/forecast';
import { fetchForecast } from '../services/openMeteo';
import type { Place } from './settings';

export interface ForecastState {
  data: ForecastData | null;
  /** Coordinates the loaded data belongs to. */
  dataFor: Place | null;
  updatedAt: number | null;
  /** 'stale' = fetch failed, showing the last cached forecast for this place. */
  status: 'idle' | 'loading' | 'ready' | 'stale' | 'error';
  error: string | null;
  load: (loc: Place) => Promise<void>;
}

let generation = 0; // drop out-of-date responses when the location changes mid-fetch

const CACHE_KEY = 'blockcast.v2.forecastCache';
// Beyond this age the cached days no longer line up with "today" — worse than no data.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CachedForecast {
  data: ForecastData;
  dataFor: Place;
  updatedAt: number;
}

function saveCache(entry: CachedForecast) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // quota exceeded or private mode — the cache is best-effort
  }
}

function readCache(loc: Place): CachedForecast | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedForecast;
    const samePlace =
      Math.abs(entry.dataFor.lat - loc.lat) < 0.01 && Math.abs(entry.dataFor.lon - loc.lon) < 0.01;
    if (!samePlace || Date.now() - entry.updatedAt > CACHE_MAX_AGE_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

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
      const updatedAt = Date.now();
      set({ data, dataFor: loc, updatedAt, status: 'ready' });
      saveCache({ data, dataFor: loc, updatedAt });
    } catch (err) {
      if (gen !== generation) return;
      const error = err instanceof Error ? err.message : String(err);
      const cached = readCache(loc);
      if (cached) {
        set({
          data: cached.data,
          dataFor: cached.dataFor,
          updatedAt: cached.updatedAt,
          status: 'stale',
          error,
        });
      } else {
        set({ status: 'error', error });
      }
    }
  },
}));
