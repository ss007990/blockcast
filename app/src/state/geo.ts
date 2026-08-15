// Device location as one shared action, so every entry point — first run, the
// masthead switcher, the location sheet — asks the same way, reports the same
// failure, and keeps `follow` mode honest.

import { create } from 'zustand';
import { distKm } from '../core/geo';
import { DICTS } from '../i18n';
import { reverseGeocode } from '../services/geocoding';
import { useSettings, type Place } from './settings';

/** 'locating' while a fix is in flight; the rest describe the last attempt. */
export type GeoStatus = 'idle' | 'locating' | 'denied' | 'unavailable';

export interface GeoState {
  status: GeoStatus;
  /** Timestamp of the last successful fix, for the throttles below. */
  fixedAt: number | null;
  supported: boolean;
  /** Switch to device location (prompts for permission the first time). */
  follow: () => Promise<boolean>;
  /** Re-check coordinates while following. No-op when the place is pinned. */
  refresh: (force?: boolean) => void;
}

/** A followed pin only moves past this, so GPS jitter never refetches. */
const MOVE_KM = 2;
/** Gap between background re-checks after a good fix. */
const OK_THROTTLE = 5 * 60_000;
/** Gap after a failed one — a cold GPS on landing must get another try soon,
 * not sit out the full success throttle. */
const FAIL_THROTTLE = 45_000;

/** Wait for the first fix, however long the radio takes to warm up.
 * `watchPosition` keeps trying where `getCurrentPosition` gives up at its
 * timeout — the difference between locating on landing and not. */
function firstFix(maxWait: number): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    let watch: number | null = null;
    // a callback can land before watchPosition() has returned its id, so
    // remember that we're finished and clear whatever id shows up after
    let done = false;
    const stop = () => {
      done = true;
      clearTimeout(timer);
      if (watch !== null) navigator.geolocation.clearWatch(watch);
    };
    const timer = setTimeout(() => {
      stop();
      reject(new Error('timeout'));
    }, maxWait);
    watch = navigator.geolocation.watchPosition(
      (pos) => {
        stop();
        resolve(pos);
      },
      (err) => {
        stop();
        reject(err);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: maxWait },
    );
    if (done) navigator.geolocation.clearWatch(watch);
  });
}

const coordsOf = (pos: GeolocationPosition) => ({
  lat: +pos.coords.latitude.toFixed(3),
  lon: +pos.coords.longitude.toFixed(3),
});

const fallbackName = () => DICTS[useSettings.getState().lang].location.myLoc;

/** Name a fix from the reverse geocoder, falling back to "My location". */
async function nameOf(lat: number, lon: number): Promise<string> {
  const name = await reverseGeocode(lat, lon, useSettings.getState().lang);
  return name || fallbackName();
}

const statusFor = (err: unknown): GeoStatus =>
  typeof err === 'object' && err !== null && (err as GeolocationPositionError).code === 1
    ? 'denied'
    : 'unavailable';

let inFlight = false;
let lastTry = 0;

export const useGeo = create<GeoState>()((set, get) => ({
  status: 'idle',
  fixedAt: null,
  supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,

  follow: async () => {
    if (!get().supported || inFlight) return false;
    inFlight = true;
    lastTry = Date.now();
    set({ status: 'locating' });
    try {
      const pos = await firstFix(30_000);
      const at = coordsOf(pos);
      // show the place immediately; the name lands a moment later
      useSettings.getState().setLoc({ name: fallbackName(), ...at, follow: true });
      set({ status: 'idle', fixedAt: Date.now() });
      const name = await nameOf(at.lat, at.lon);
      const cur = useSettings.getState().loc;
      if (cur.follow && cur.lat === at.lat && cur.lon === at.lon) {
        useSettings.getState().setLoc({ name, ...at, follow: true });
      }
      return true;
    } catch (err) {
      set({ status: statusFor(err) });
      return false;
    } finally {
      inFlight = false;
    }
  },

  refresh: (force = false) => {
    const st = get();
    if (!st.supported || inFlight) return;
    if (!useSettings.getState().loc.follow) return;
    const now = Date.now();
    const wait = st.status === 'idle' && st.fixedAt != null ? OK_THROTTLE : FAIL_THROTTLE;
    if (!force && now - lastTry < wait) return;
    // a failed attempt must not consume the long throttle, so `lastTry` is the
    // only clock here and the wait above depends on how the last one ended
    lastTry = now;
    inFlight = true;
    void (async () => {
      try {
        const pos = await firstFix(30_000);
        const at = coordsOf(pos);
        const cur = useSettings.getState().loc;
        if (!cur.follow) return; // pinned while the fix was in flight
        set({ status: 'idle', fixedAt: Date.now() });
        const moved = distKm(cur, at) >= MOVE_KM;
        // rename an unnamed fix even when it hasn't moved, so the chip never
        // stays stuck on the generic "My location"
        if (!moved && cur.name !== fallbackName()) return;
        const place: Place = moved ? { name: cur.name, ...at, follow: true } : cur;
        if (moved) useSettings.getState().setLoc(place);
        const name = await nameOf(place.lat, place.lon);
        const now2 = useSettings.getState().loc;
        if (now2.follow && now2.lat === place.lat && now2.lon === place.lon) {
          useSettings.getState().setLoc({ ...place, name });
        }
      } catch (err) {
        set({ status: statusFor(err) });
      } finally {
        inFlight = false;
      }
    })();
  },
}));
