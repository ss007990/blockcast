// MétéoMédia-style future radar: ECCC's observed composite for the last
// hour, then HRDPS model rain for the next six, auto-playing on a Leaflet
// map. Every frame is a GeoMet WMS layer keyed by TIME; animation is done
// by preloading all frames at opacity 0 and lighting one up at a time.

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
import {
  buildRadarFrames,
  timeDimFromCapabilities,
  type RadarFrame,
} from '../../core/radarFrames';
import { useT } from '../../hooks';
import { useSettings } from '../../state/settings';
import s from './radar.module.css';

const GEOMET = 'https://geo.weather.gc.ca/geomet';
const RADAR_LAYER = 'RADAR_1KM_RRAI';
const MODEL_LAYER = 'HRDPS.CONTINENTAL_PR';
const FRAME_MS = 550;
const END_HOLD_MS = 1600;

const capsUrl = (layer: string) =>
  `${GEOMET}?service=WMS&version=1.3.0&request=GetCapabilities&layers=${layer}`;

export function FutureRadar() {
  const t = useT();
  const loc = useSettings((st) => st.loc);

  const [frames, setFrames] = useState<RadarFrame[] | null>(null);
  const [err, setErr] = useState(false);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<TileLayer[]>([]);

  // frame plan from what GeoMet actually serves right now
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const [radarXml, modelXml] = await Promise.all([
          fetch(capsUrl(RADAR_LAYER)).then((r) => r.text()),
          fetch(capsUrl(MODEL_LAYER)).then((r) => r.text()),
        ]);
        const radar = timeDimFromCapabilities(radarXml);
        const model = timeDimFromCapabilities(modelXml);
        if (!radar || !model) throw new Error('no time dimension');
        const plan = buildRadarFrames(radar, model);
        if (plan.length < 2) throw new Error('empty plan');
        if (!disposed) {
          setFrames(plan);
          // start where "now" is: the newest observed frame
          setIdx(plan.filter((f) => f.kind === 'radar').length - 1);
        }
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
    };
  }, []);

  // map + one WMS layer per frame, preloaded invisible
  useEffect(() => {
    if (!frames) return;
    let disposed = false;
    void (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        if (disposed || !mapDiv.current || mapRef.current) return;
        const map = L.map(mapDiv.current, { scrollWheelZoom: false }).setView(
          [loc.lat, loc.lon],
          8,
        );
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 12,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
            ' · <a href="https://eccc-msc.github.io/open-data/">ECCC MSC</a>',
        }).addTo(map);
        L.marker([loc.lat, loc.lon], {
          icon: L.divIcon({ className: 'bc-pin', html: '📍', iconSize: [24, 24], iconAnchor: [12, 22] }),
        }).addTo(map);
        layersRef.current = frames.map((f) =>
          L.tileLayer
            .wms(GEOMET, {
              layers: f.kind === 'radar' ? RADAR_LAYER : MODEL_LAYER,
              format: 'image/png',
              transparent: true,
              version: '1.3.0',
              opacity: 0,
              // TIME is what selects the frame; Leaflet forwards unknown params
              ...({ time: new Date(f.time).toISOString().replace(/\.\d{3}Z$/, 'Z') } as object),
            })
            .addTo(map),
        );
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 60);
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames]);

  // light up the active frame
  useEffect(() => {
    const layers = layersRef.current;
    if (!layers.length) return;
    layers.forEach((l, i) => l.setOpacity(i === idx ? 0.75 : 0));
  }, [idx, frames]);

  // the animation clock, holding a beat on the last frame
  useEffect(() => {
    if (!playing || !frames) return;
    const timer = setTimeout(
      () => setIdx((i) => (i + 1) % frames.length),
      idx === frames.length - 1 ? END_HOLD_MS : FRAME_MS,
    );
    return () => clearTimeout(timer);
  }, [playing, idx, frames]);

  if (err) return <div className={s.hybridErr}>{t.radar.hybridErr}</div>;
  if (!frames) return <div className={s.hybridErr}>{t.radar.hybridLoading}</div>;

  const nowTime = frames.reduce((n, f) => (f.kind === 'radar' ? f.time : n), frames[0]!.time);
  const cur = frames[idx]!;
  const offMin = Math.round((cur.time - nowTime) / 60_000);
  const label =
    offMin === 0
      ? t.radar.now
      : Math.abs(offMin) < 100
        ? `${offMin > 0 ? '+' : ''}${offMin} min`
        : `${offMin > 0 ? '+' : ''}${Math.round(offMin / 60)} h`;

  return (
    <div>
      <div ref={mapDiv} className={s.hybridMap} />
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
          max={frames.length - 1}
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
