// MétéoMédia-style future radar, all from free ECCC GeoMet layers: observed
// composite for the past hour, ECCC's official PySTEPS extrapolation for the
// next ~72 min (same 1 km grid and palette, so "now" is seamless), then
// HRDPS model rain out to +6 h. Each frame is ONE image for the visible
// bbox, preloaded before playback starts, rebuilt on pan/zoom. The base map
// is a desaturated vector style (OpenFreeMap) so precipitation is the only
// saturated thing on it, with place labels kept above the radar.

import { useEffect, useRef, useState } from 'react';
import type { Map as MlMap } from 'maplibre-gl';
import {
  buildRadarFrames,
  buildRainbowFrames,
  timeDimFromCapabilities,
  type RadarFrame,
} from '../../core/radarFrames';
import { radarProvider, type RadarProvider } from '../../core/radarCoverage';
import { mercX, mercY, snapView, type SnappedView } from '../../core/radarView';
// MapLibre resolves its worker as a file next to its own module, which only
// exists in node_modules: no bundler emits it, so production maps render
// nothing (dev worked because the dep-optimizer exclusion serves the real
// file). ?worker&url makes Vite bundle the worker self-contained and hand
// back its emitted URL for setWorkerUrl below.
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { useT } from '../../hooks';
import { fill } from '../../i18n';
import { useSettings } from '../../state/settings';
import { stitchRainbowFrame } from './rainbowTiles';
import s from './radar.module.css';

const GEOMET = 'https://geo.weather.gc.ca/geomet';
const RADAR_LAYER = 'RADAR_1KM_RRAI';
// ECCC's own radar nowcast: multi-scale motion of the composite projected
// forward, refreshed every 6 minutes (what WeatherCAN plays as future radar)
const NOWCAST_LAYER = 'Radar_1km_RainPrecipRate-Extrapolation';
// instantaneous rate: the model analog of radar (PR/PC are accumulations)
const MODEL_LAYER = 'HRDPS.CONTINENTAL_RT';
const STYLE_LIGHT = 'https://tiles.openfreemap.org/styles/positron';
const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';
const API = import.meta.env.VITE_PUSH_API as string | undefined;
const RAINBOW_LAYER = 'precip';
// Rainbow bills per tile, so its frames are built one grid level coarser than
// the display: a quarter of the tiles, on an already smooth field.
const RAINBOW_DENSITY = 0.5;
const FRAME_MS = 550;
const END_HOLD_MS = 1600;
const CROSSFADE_MS = 300;
const OPACITY = 0.75;
// HRDPS is a 2.5 km grid; a touch of baked-in blur melts the blocky cells
// into the smooth look people know from broadcast future radar
const MODEL_BLUR_PX = 1.25;

// Frames and capabilities go through the worker when it is configured: it
// caches per cell rectangle at the edge, so every extra viewer of a city is
// free and MSC sees one request instead of one per device.
//
// 'direct' is the fallback, and it is load-bearing rather than decorative. A
// local build has no VITE_PUSH_API; more importantly the app and the worker
// deploy separately, so between shipping the app and deploying the worker the
// proxy route simply does not exist. Radar is the feature people open first,
// and it should degrade to slightly-more-upstream-traffic, never to an error
// screen. So the capabilities step decides the route and the frames follow it.
type Route = 'worker' | 'direct';

const isoOf = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

const capsUrl = (route: Route, layer: string) =>
  route === 'worker'
    ? `${API}/api/geomet/caps/${layer}`
    : `${GEOMET}?service=WMS&version=1.3.0&request=GetCapabilities&layers=${layer}`;

/** One frame image. Both routes describe the same rectangle of grid cells;
 * only who resolves it differs. */
function geometUrl(route: Route, layer: string, timeMs: number, v: SnappedView): string {
  const time = isoOf(timeMs);
  if (route === 'worker') {
    return `${API}/api/geomet/map/${layer}/${time}/${v.z}/${v.x0}/${v.y0}/${v.nx}/${v.ny}.png`;
  }
  return (
    `${GEOMET}?` +
    new URLSearchParams({
      service: 'WMS',
      version: '1.3.0',
      request: 'GetMap',
      layers: layer,
      format: 'image/png',
      transparent: 'true',
      crs: 'EPSG:3857',
      bbox: v.bbox.join(','),
      width: String(v.width),
      height: String(v.height),
      time,
    })
  );
}

const frameUrl = (route: Route, f: RadarFrame, view: SnappedView): string =>
  geometUrl(
    route,
    f.kind === 'model' ? MODEL_LAYER : f.kind === 'nowcast' ? NOWCAST_LAYER : RADAR_LAYER,
    f.time,
    view,
  );

/** The current viewport as a cell rectangle, at the device's pixel density.
 * `densityFactor` below 1 asks for a coarser grid: the Rainbow tier pays per
 * tile, and half the density is a quarter of the tiles on a field that is
 * heavily smoothed to begin with. */
function viewOf(map: MlMap, densityFactor = 1): SnappedView {
  const dpr = window.devicePixelRatio || 1;
  const density = Math.min(3, Math.max(1, Math.round(dpr))) * densityFactor;
  const b = map.getBounds();
  return snapView(
    {
      xmin: mercX(b.getWest()),
      ymin: mercY(b.getSouth()),
      xmax: mercX(b.getEast()),
      ymax: mercY(b.getNorth()),
    },
    map.getZoom(),
    density,
  );
}

/** Preload a frame; model frames get their blur baked in (raster layers
 * cannot be CSS-filtered). Falls back to the raw image if canvas work
 * fails, and resolves null only when the fetch itself fails. */
const loadFrame = (url: string, blurPx: number) =>
  new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onerror = () => resolve(null);
    img.onload = () => {
      if (!blurPx) return resolve(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(url);
        ctx.filter = `blur(${blurPx.toFixed(2)}px)`;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(url); // canvas tainted: show the frame sharp rather than not at all
      }
    };
    img.src = url;
  });

export function FutureRadar() {
  const t = useT();
  const loc = useSettings((st) => st.loc);
  const provider: RadarProvider = radarProvider(loc.lat, loc.lon);

  const [plan, setPlan] = useState<{
    provider: RadarProvider;
    /** which side resolves GeoMet frames; irrelevant to the Rainbow tier */
    route: Route;
    frames: RadarFrame[];
    radarEnd: number;
  } | null>(null);
  const [err, setErr] = useState(false);
  // the Rainbow tier needs the worker; without it there is nothing to show
  const [unavailable, setUnavailable] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const frameIdsRef = useRef<string[]>([]);
  const idxRef = useRef(0);
  const loadToken = useRef(0);
  // mirror idx for the async overlay builder; refs must not be written in render
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);

  // the frame plan comes from what the source advertises, never the clock
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        if (provider === 'rainbow') {
          if (!API) {
            if (!disposed) setUnavailable(true);
            return;
          }
          const st = (await (await fetch(`${API}/api/rain/status`)).json()) as {
            enabled?: boolean;
          };
          if (!st.enabled) {
            if (!disposed) setUnavailable(true);
            return;
          }
          const snap = (await (
            await fetch(`${API}/api/rain/snapshot/${RAINBOW_LAYER}`)
          ).json()) as { snapshot?: number };
          if (!snap.snapshot) throw new Error('no snapshot');
          const frames = buildRainbowFrames(snap.snapshot * 1000);
          if (!disposed) {
            setPlan({ provider, route: 'direct', frames, radarEnd: snap.snapshot * 1000 });
            setIdx(frames.filter((f) => f.kind === 'radar').length - 1);
          }
          return;
        }
        const dim = (route: Route, layer: string) =>
          fetch(capsUrl(route, layer))
            .then((r) => (r.ok ? r.text() : null))
            .then((x) => (x == null ? null : timeDimFromCapabilities(x)))
            .catch(() => null);
        const dims = (route: Route) =>
          Promise.all([
            dim(route, RADAR_LAYER),
            dim(route, NOWCAST_LAYER),
            dim(route, MODEL_LAYER),
          ]);

        let route: Route = API ? 'worker' : 'direct';
        let [radar, nowcast, model] = await dims(route);
        // no radar window through the proxy means the route is missing or
        // down, not that ECCC has stopped publishing: fall back to upstream
        if (!radar && route === 'worker') {
          route = 'direct';
          [radar, nowcast, model] = await dims(route);
        }
        if (!radar) throw new Error('no radar time dimension');
        const frames = buildRadarFrames(radar, nowcast, model);
        if (frames.length < 2) throw new Error('empty plan');
        if (!disposed) {
          setPlan({ provider, route, frames, radarEnd: radar.end });
          setIdx(frames.filter((f) => f.kind === 'radar').length - 1);
        }
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [provider]);

  // build every frame image for the current view; swap in only when complete
  const rebuildOverlays = async (
    map: MlMap,
    p: { provider: RadarProvider; route: Route; frames: RadarFrame[]; radarEnd: number },
  ) => {
    const token = ++loadToken.current;
    const view = viewOf(map, p.provider === 'rainbow' ? RAINBOW_DENSITY : 1);
    const frames = p.frames;
    const buildOne = (f: RadarFrame): Promise<string | null> => {
      if (p.provider === 'rainbow') {
        // past = older snapshots at forecast 0; future = offsets on the latest
        const future = f.time > p.radarEnd;
        const snap = Math.round((future ? p.radarEnd : f.time) / 1000);
        const fsec = future ? Math.round((f.time - p.radarEnd) / 1000) : 0;
        return stitchRainbowFrame(API!, RAINBOW_LAYER, snap, fsec, view);
      }
      return loadFrame(frameUrl(p.route, f, view), f.kind === 'model' ? MODEL_BLUR_PX * view.scale : 0);
    };
    let done = 0;
    setProgress({ done: 0, total: frames.length });
    const urls = await Promise.all(
      frames.map((f) =>
        buildOne(f).then((u) => {
          if (token === loadToken.current) setProgress({ done: ++done, total: frames.length });
          return u;
        }),
      ),
    );
    if (token !== loadToken.current || !mapRef.current) return;
    if (urls.some((u) => u == null)) {
      setProgress(null); // a source failed: keep the old set
      return;
    }

    // labels stay above the radar: insert every frame below the first symbol layer
    const labelLayer = map.getStyle().layers?.find((l) => l.type === 'symbol')?.id;
    frameIdsRef.current.forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(id)) map.removeSource(id);
    });
    frameIdsRef.current = urls.map((u, i) => {
      const id = `bc-frame-${token}-${i}`;
      map.addSource(id, { type: 'image', url: u!, coordinates: view.coords });
      map.addLayer(
        {
          id,
          type: 'raster',
          source: id,
          paint: {
            'raster-opacity': i === idxRef.current ? OPACITY : 0,
            // the outgoing frame fades while the incoming one rises, so rain
            // blends between steps instead of blinking (broadcast-radar feel)
            'raster-opacity-transition': { duration: CROSSFADE_MS, delay: 0 },
            'raster-fade-duration': 0,
            'raster-resampling': 'linear',
          },
        },
        labelLayer,
      );
      return id;
    });
    setProgress(null);
  };

  // map init, then frames for the initial view
  useEffect(() => {
    if (!plan) return;
    let disposed = false;
    void (async () => {
      try {
        await import('maplibre-gl/dist/maplibre-gl.css');
        const ml = await import('maplibre-gl');
        ml.setWorkerUrl(maplibreWorkerUrl);
        if (disposed || !mapDiv.current || mapRef.current) return;
        const dark = document.documentElement.dataset.theme === 'dark';
        const map = new ml.Map({
          container: mapDiv.current,
          style: dark ? STYLE_DARK : STYLE_LIGHT,
          center: [loc.lon, loc.lat],
          zoom: 7, // matches the old Leaflet 8 (512px vector tiles are one level off)
          minZoom: 3,
          maxZoom: 11,
          attributionControl: false,
        });
        map.scrollZoom.disable();
        map.touchPitch.disable();
        map.dragRotate.disable();
        if (import.meta.env.DEV)
          (window as unknown as { __bcRadarMap?: unknown }).__bcRadarMap = map;
        const pin = document.createElement('div');
        pin.className = 'bc-pin';
        pin.textContent = '📍';
        new ml.Marker({ element: pin, anchor: 'bottom' }).setLngLat([loc.lon, loc.lat]).addTo(map);
        mapRef.current = map;
        // moveend fires after pan and zoom both; small debounce coalesces flings
        let debounce: ReturnType<typeof setTimeout>;
        map.on('moveend', () => {
          clearTimeout(debounce);
          debounce = setTimeout(() => void rebuildOverlays(map, plan), 250);
        });
        // 'load' and isStyleLoaded() both wait for painted tiles, which never
        // come in a hidden tab (no requestAnimationFrame there). 'style.load'
        // fires as soon as the style JSON is parsed, which is all addLayer
        // needs, so frames start loading even when the sheet opens in the
        // background. Attached synchronously after the constructor: the style
        // fetch cannot have finished yet, so the event cannot be missed.
        map.once('style.load', () => void rebuildOverlays(map, plan));
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
      loadToken.current++;
      mapRef.current?.remove();
      mapRef.current = null;
      frameIdsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  // light up the active frame (all images are already decoded)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    frameIdsRef.current.forEach((id, i) => {
      if (map.getLayer(id)) map.setPaintProperty(id, 'raster-opacity', i === idx ? OPACITY : 0);
    });
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

  if (unavailable) return <div className={s.hybridErr}>{t.radar.noCoverage}</div>;
  if (err) return <div className={s.hybridErr}>{t.radar.hybridErr}</div>;
  if (!plan) return <div className={s.hybridErr}>{t.radar.hybridLoading}</div>;

  const cur = plan.frames[idx]!;
  const offMin = Math.round((cur.time - plan.radarEnd) / 60_000);
  // where "now" sits on the scrubber: the last observed frame
  const nowFrac =
    plan.frames.findLastIndex((f) => f.kind === 'radar') / Math.max(1, plan.frames.length - 1);
  const label =
    offMin === 0
      ? t.radar.now
      : Math.abs(offMin) < 100
        ? `${offMin > 0 ? '+' : ''}${offMin} min`
        : `${offMin > 0 ? '+' : ''}${Math.round(offMin / 60)} h`;

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
        <div className={s.rangeWrap} style={{ ['--now-frac' as string]: nowFrac }}>
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
          <span className={s.nowTick} aria-hidden="true" />
        </div>
        <span className={s.frameLabel} data-future={offMin > 0 || undefined}>
          {cur.kind === 'model' ? '≈ ' : ''}
          {label}
        </span>
      </div>
    </div>
  );
}
