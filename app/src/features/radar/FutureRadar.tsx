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
  timeDimFromCapabilities,
  type RadarFrame,
} from '../../core/radarFrames';
import { radarProvider } from '../../core/radarCoverage';
import { useT } from '../../hooks';
import { fill } from '../../i18n';
import { useSettings } from '../../state/settings';
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
const FRAME_MS = 550;
const END_HOLD_MS = 1600;
const OPACITY = 0.75;
// HRDPS is a 2.5 km grid; a touch of baked-in blur melts the blocky cells
// into the smooth look people know from broadcast future radar
const MODEL_BLUR_PX = 1.25;

const capsUrl = (layer: string) =>
  `${GEOMET}?service=WMS&version=1.3.0&request=GetCapabilities&layers=${layer}`;

const isoOf = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

interface View {
  /** WMS bbox in EPSG:3857 metres */
  bbox: string;
  /** image corners for the map overlay, [w,n] [e,n] [e,s] [w,s] */
  coords: [[number, number], [number, number], [number, number], [number, number]];
  w: number;
  h: number;
  /** CSS px → image px factor, for pixel-space effects like the model blur */
  scale: number;
}

const R = 6378137;
const mercX = (lon: number) => R * ((lon * Math.PI) / 180);
const mercY = (lat: number) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

/** GeoMet GetMap: the whole frame in a single request for the bbox. */
const geometUrl = (layer: string, timeMs: number, view: View): string =>
  `${GEOMET}?` +
  new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: layer,
    format: 'image/png',
    transparent: 'true',
    crs: 'EPSG:3857',
    bbox: view.bbox,
    width: String(view.w),
    height: String(view.h),
    time: isoOf(timeMs),
  });

const frameUrl = (f: RadarFrame, view: View): string =>
  geometUrl(
    f.kind === 'model' ? MODEL_LAYER : f.kind === 'nowcast' ? NOWCAST_LAYER : RADAR_LAYER,
    f.time,
    view,
  );

/** The current viewport, sized for the device's real pixel density. */
function viewOf(map: MlMap): View {
  const el = map.getContainer();
  const cssW = el.clientWidth;
  const cssH = el.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  let scale = Math.min(3, Math.max(1, Math.round(dpr)));
  while (scale > 1 && Math.max(cssW, cssH) * scale > 2048) scale -= 1;
  const b = map.getBounds();
  const west = b.getWest();
  const east = b.getEast();
  const south = b.getSouth();
  const north = b.getNorth();
  return {
    bbox: `${mercX(west)},${mercY(south)},${mercX(east)},${mercY(north)}`,
    coords: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    w: Math.round(cssW * scale),
    h: Math.round(cssH * scale),
    scale,
  };
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
  const covered = radarProvider(loc.lat, loc.lon) === 'eccc';

  const [plan, setPlan] = useState<{ frames: RadarFrame[]; radarEnd: number } | null>(null);
  const [err, setErr] = useState(false);
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

  // the frame plan comes from what the three layers advertise, never the clock
  useEffect(() => {
    if (!covered) return;
    let disposed = false;
    void (async () => {
      try {
        const dim = (layer: string) =>
          fetch(capsUrl(layer))
            .then((r) => r.text())
            .then(timeDimFromCapabilities)
            .catch(() => null);
        const [radar, nowcast, model] = await Promise.all([
          dim(RADAR_LAYER),
          dim(NOWCAST_LAYER),
          dim(MODEL_LAYER),
        ]);
        if (!radar) throw new Error('no radar time dimension');
        const frames = buildRadarFrames(radar, nowcast, model);
        if (frames.length < 2) throw new Error('empty plan');
        if (!disposed) {
          setPlan({ frames, radarEnd: radar.end });
          setIdx(frames.filter((f) => f.kind === 'radar').length - 1);
        }
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [covered]);

  // build every frame image for the current view; swap in only when complete
  const rebuildOverlays = async (map: MlMap, frames: RadarFrame[]) => {
    const token = ++loadToken.current;
    const view = viewOf(map);
    let done = 0;
    setProgress({ done: 0, total: frames.length });
    const urls = await Promise.all(
      frames.map((f) =>
        loadFrame(frameUrl(f, view), f.kind === 'model' ? MODEL_BLUR_PX * view.scale : 0).then(
          (u) => {
            if (token === loadToken.current)
              setProgress({ done: ++done, total: frames.length });
            return u;
          },
        ),
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
    if (!plan || !covered) return;
    let disposed = false;
    void (async () => {
      try {
        await import('maplibre-gl/dist/maplibre-gl.css');
        const ml = await import('maplibre-gl');
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
          debounce = setTimeout(() => void rebuildOverlays(map, plan.frames), 250);
        });
        // 'load' and isStyleLoaded() both wait for painted tiles, which never
        // come in a hidden tab (no requestAnimationFrame there). 'style.load'
        // fires as soon as the style JSON is parsed, which is all addLayer
        // needs, so frames start loading even when the sheet opens in the
        // background. Attached synchronously after the constructor: the style
        // fetch cannot have finished yet, so the event cannot be missed.
        map.once('style.load', () => void rebuildOverlays(map, plan.frames));
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
  }, [plan, covered]);

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

  if (!covered) return <div className={s.hybridErr}>{t.radar.noCoverage}</div>;
  if (err) return <div className={s.hybridErr}>{t.radar.hybridErr}</div>;
  if (!plan) return <div className={s.hybridErr}>{t.radar.hybridLoading}</div>;

  const cur = plan.frames[idx]!;
  const offMin = Math.round((cur.time - plan.radarEnd) / 60_000);
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
        <span className={s.frameLabel} data-future={offMin > 0 || undefined}>
          {cur.kind === 'model' ? '≈ ' : ''}
          {label}
        </span>
      </div>
    </div>
  );
}
