// MétéoMédia-style future radar with two data tiers. Premium (when the
// worker holds Xweather credentials): observed radar for the past hour and
// true radar extrapolation for the next one, 10-minute steps, then HRDPS
// model rain hourly out to +6 h. Fallback (always available): ECCC observed
// radar + HRDPS, all free. Each frame is ONE image for the visible bbox,
// preloaded before playback starts, rebuilt on pan/zoom.

import { useEffect, useRef, useState } from 'react';
import type { CRS, ImageOverlay, LatLngBounds, Map as LeafletMap } from 'leaflet';
import {
  buildHybridFrames,
  buildRadarFrames,
  timeDimFromCapabilities,
  type HybridFrame,
} from '../../core/radarFrames';
import { useT } from '../../hooks';
import { fill } from '../../i18n';
import { useSettings } from '../../state/settings';
import s from './radar.module.css';

const GEOMET = 'https://geo.weather.gc.ca/geomet';
const RADAR_LAYER = 'RADAR_1KM_RRAI';
// instantaneous rate: the model analog of radar (PR/PC are accumulations)
const MODEL_LAYER = 'HRDPS.CONTINENTAL_RT';
const API = import.meta.env.VITE_PUSH_API as string | undefined;
const FRAME_MS = 550;
const END_HOLD_MS = 1600;
const OPACITY = 0.75;

const capsUrl = (layer: string) =>
  `${GEOMET}?service=WMS&version=1.3.0&request=GetCapabilities&layers=${layer}`;

const isoOf = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

type Mode = 'premium' | 'eccc';

interface View {
  bounds: LatLngBounds;
  centerLat: number;
  centerLon: number;
  z: number;
  w: number;
  h: number;
}

/** GeoMet GetMap: the whole frame in a single request for the bbox. */
function geometUrl(layer: string, timeMs: number, view: View, crs: CRS): string {
  const sw = crs.project(view.bounds.getSouthWest());
  const ne = crs.project(view.bounds.getNorthEast());
  const p = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layer,
    format: 'image/png',
    transparent: 'true',
    crs: 'EPSG:3857',
    bbox: `${sw.x},${sw.y},${ne.x},${ne.y}`,
    width: String(view.w),
    height: String(view.h),
    time: isoOf(timeMs),
  });
  return `${GEOMET}?${p}`;
}

/** Worker-proxied Xweather flat map, centre/zoom addressed. */
function rimgUrl(layer: 'radar' | 'fradar', offMin: number, view: View): string {
  const off = offMin === 0 ? 'current' : `${offMin > 0 ? '+' : ''}${offMin}min`;
  return (
    `${API}/api/rimg/${layer}/${view.w}x${view.h}` +
    `/${view.centerLat.toFixed(4)},${view.centerLon.toFixed(4)},${view.z}/${off}.png`
  );
}

function frameUrl(f: HybridFrame, mode: Mode, view: View, crs: CRS): string {
  if (mode === 'premium' && f.kind !== 'model') return rimgUrl(f.kind, f.offMin, view);
  if (f.kind === 'model') return geometUrl(MODEL_LAYER, f.time!, view, crs);
  return geometUrl(RADAR_LAYER, f.time!, view, crs);
}

/** The current viewport, sized so premium images come back retina-sharp:
 * doubling the pixels means asking one zoom level deeper, same bbox. */
function viewOf(map: LeafletMap): View {
  const size = map.getSize();
  const c = map.getCenter();
  let scale = (window.devicePixelRatio || 1) >= 1.5 ? 2 : 1;
  if (Math.max(size.x, size.y) * scale > 2048) scale = 1;
  return {
    bounds: map.getBounds(),
    centerLat: c.lat,
    centerLon: c.lng,
    z: Math.round(map.getZoom()) + (scale === 2 ? 1 : 0),
    w: Math.round(size.x * scale),
    h: Math.round(size.y * scale),
  };
}

const preload = (url: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // a missing frame shows as empty, not a stall
    img.src = url;
  });

export function FutureRadar() {
  const t = useT();
  const loc = useSettings((st) => st.loc);

  const [plan, setPlan] = useState<{ mode: Mode; frames: HybridFrame[] } | null>(null);
  const [err, setErr] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const overlaysRef = useRef<ImageOverlay[]>([]);
  const idxRef = useRef(0);
  const loadToken = useRef(0);
  idxRef.current = idx;

  // pick the tier, then build the frame plan from what the servers offer
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        let premium = false;
        if (API) {
          try {
            const st = (await (await fetch(`${API}/api/rimg/status`)).json()) as {
              enabled?: boolean;
            };
            premium = !!st.enabled;
          } catch {
            premium = false;
          }
        }
        const modelXml = await fetch(capsUrl(MODEL_LAYER)).then((r) => r.text());
        const model = timeDimFromCapabilities(modelXml);

        if (premium) {
          const frames = buildHybridFrames(model, Date.now());
          if (frames.length < 2) throw new Error('empty plan');
          if (!disposed) {
            setPlan({ mode: 'premium', frames });
            setIdx(frames.filter((f) => f.kind === 'radar').length - 1);
          }
          return;
        }

        const radarXml = await fetch(capsUrl(RADAR_LAYER)).then((r) => r.text());
        const radar = timeDimFromCapabilities(radarXml);
        if (!radar || !model) throw new Error('no time dimension');
        const eccc = buildRadarFrames(radar, model);
        if (eccc.length < 2) throw new Error('empty plan');
        const frames: HybridFrame[] = eccc.map((f) => ({
          kind: f.kind,
          offMin: Math.round((f.time - radar.end) / 60_000),
          time: f.time,
        }));
        if (!disposed) {
          setPlan({ mode: 'eccc', frames });
          setIdx(frames.filter((f) => f.kind === 'radar').length - 1);
        }
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
    };
  }, []);

  // build every frame image for the current view; swap in only when complete
  const rebuildOverlays = async (map: LeafletMap, p: { mode: Mode; frames: HybridFrame[] }) => {
    const L = leafletRef.current;
    if (!L) return;
    const token = ++loadToken.current;
    const view = viewOf(map);
    const urls = p.frames.map((f) => frameUrl(f, p.mode, view, L.CRS.EPSG3857));

    let done = 0;
    setProgress({ done: 0, total: urls.length });
    await Promise.all(
      urls.map((u) =>
        preload(u).then(() => {
          if (token === loadToken.current) setProgress({ done: ++done, total: urls.length });
        }),
      ),
    );
    if (token !== loadToken.current || !mapRef.current) return;

    overlaysRef.current.forEach((o) => o.remove());
    overlaysRef.current = urls.map((u, i) =>
      L.imageOverlay(u, view.bounds, {
        opacity: i === idxRef.current ? OPACITY : 0,
        className: p.frames[i]!.kind === 'model' ? 'bc-model-frame' : undefined,
      }).addTo(map),
    );
    setProgress(null);
  };

  // map init, then frames for the initial view
  useEffect(() => {
    if (!plan) return;
    let disposed = false;
    void (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        if (disposed || !mapDiv.current || mapRef.current) return;
        leafletRef.current = L;
        const map = L.map(mapDiv.current, { scrollWheelZoom: false }).setView(
          [loc.lat, loc.lon],
          8,
        );
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 12,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
            (plan.mode === 'premium'
              ? ' · <a href="https://www.xweather.com/">Xweather</a>'
              : '') +
            ' · <a href="https://eccc-msc.github.io/open-data/">ECCC MSC</a>',
        }).addTo(map);
        L.marker([loc.lat, loc.lon], {
          icon: L.divIcon({ className: 'bc-pin', html: '📍', iconSize: [24, 24], iconAnchor: [12, 22] }),
        }).addTo(map);
        mapRef.current = map;
        // moveend fires after pan and zoom both; small debounce coalesces flings
        let debounce: ReturnType<typeof setTimeout>;
        map.on('moveend', () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => void rebuildOverlays(map, plan), 250);
        });
        setTimeout(() => {
          map.invalidateSize();
          void rebuildOverlays(map, plan);
        }, 60);
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
      loadToken.current++;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      overlaysRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // light up the active frame (all images are already decoded)
  useEffect(() => {
    overlaysRef.current.forEach((o, i) => o.setOpacity(i === idx ? OPACITY : 0));
  }, [idx, progress]);

  // the animation clock, holding a beat on the last frame
  useEffect(() => {
    if (!playing || !plan || progress) return;
    const timer = setTimeout(
      () => setIdx((i) => (i + 1) % plan.frames.length),
      idx === plan.frames.length - 1 ? END_HOLD_MS : FRAME_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, idx, plan, progress]);

  if (err) return <div className={s.hybridErr}>{t.radar.hybridErr}</div>;
  if (!plan) return <div className={s.hybridErr}>{t.radar.hybridLoading}</div>;

  const cur = plan.frames[idx]!;
  const label =
    cur.offMin === 0
      ? t.radar.now
      : Math.abs(cur.offMin) < 100
        ? `${cur.offMin > 0 ? '+' : ''}${cur.offMin} min`
        : `${cur.offMin > 0 ? '+' : ''}${Math.round(cur.offMin / 60)} h`;

  return (
    <div>
      <div className={s.hybridWrap}>
        <div ref={mapDiv} className={s.hybridMap} />
        {progress && (
          <div className={s.frameProgress}>
            {fill(t.radar.frames, { done: String(progress.done), total: String(progress.total) })}
          </div>
        )}
      </div>
      <div className={s.timeline}>
        <button
          className={s.playBtn}
          aria-label={playing ? t.radar.pause : t.radar.play}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={0}
          max={plan.frames.length - 1}
          value={idx}
          aria-label={t.radar.title}
          onChange={(e) => {
            setPlaying(false);
            setIdx(Number(e.target.value));
          }}
        />
        <span className={s.frameLabel} data-future={cur.kind === 'model' || undefined}>
          {cur.kind === 'model' ? '≈ ' : ''}
          {label}
        </span>
      </div>
    </div>
  );
}
