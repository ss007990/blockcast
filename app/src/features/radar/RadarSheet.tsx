// Live rain radar — RainViewer frames animated over an OSM map, centred on
// the current location. Radar's short horizon (last 2 h observed, +30 min
// projected) complements the model forecast the rest of the app runs on.

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, TileLayer } from 'leaflet';
import { useLocale, useT } from '../../hooks';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { uiCss } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import s from './radar.module.css';

interface Frame {
  time: number;
  path: string;
}

const FRAME_MS = 650;
const RADAR_OPACITY = 0.7;

export function RadarSheet() {
  const { radarOpen, setRadarOpen } = useUi();
  const t = useT();
  return (
    <Sheet open={radarOpen} onClose={() => setRadarOpen(false)} ariaLabel={t.radar.title}>
      {radarOpen && <RadarContent />}
    </Sheet>
  );
}

function RadarContent() {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerFor = useRef<((i: number) => TileLayer) | null>(null);
  const layers = useRef<Map<number, TileLayer>>(new Map());

  const [frames, setFrames] = useState<Frame[]>([]);
  const [pastCount, setPastCount] = useState(0);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [err, setErr] = useState(false);

  // one-shot init: load Leaflet + the RainViewer frame index, build the map
  useEffect(() => {
    let disposed = false;
    const layerCache = layers.current;
    void (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = (await res.json()) as {
          host: string;
          radar?: { past?: Frame[]; nowcast?: Frame[] };
        };
        const past = data.radar?.past ?? [];
        const all = [...past, ...(data.radar?.nowcast ?? [])];
        if (disposed || !mapDiv.current || mapRef.current) return;
        if (!all.length) {
          setErr(true);
          return;
        }

        const map = L.map(mapDiv.current, { maxZoom: 11 }).setView([st.loc.lat, st.loc.lon], 7);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        L.marker([st.loc.lat, st.loc.lon], {
          interactive: false,
          icon: L.divIcon({
            className: 'bc-pin',
            html: '📍',
            iconSize: [24, 24],
            iconAnchor: [12, 22],
          }),
        }).addTo(map);
        mapRef.current = map;

        // frame layers are created lazily and cached; opacity does the swapping
        layerFor.current = (i) => {
          let ly = layers.current.get(i);
          if (!ly) {
            ly = L.tileLayer(`${data.host}${all[i]!.path}/256/{z}/{x}/{y}/2/1_1.png`, {
              opacity: 0,
              zIndex: 5,
            }).addTo(map);
            layers.current.set(i, ly);
          }
          return ly;
        };

        setFrames(all);
        setPastCount(past.length);
        setIdx(past.length - 1); // start on the most recent observation
        setTimeout(() => map.invalidateSize(), 50);
      } catch {
        if (!disposed) setErr(true);
      }
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerFor.current = null;
      layerCache.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // show the current frame, hide the rest, prefetch the next one
  useEffect(() => {
    const make = layerFor.current;
    if (!make || !frames.length) return;
    for (const [i, ly] of layers.current) ly.setOpacity(i === idx ? RADAR_OPACITY : 0);
    make(idx).setOpacity(RADAR_OPACITY);
    make((idx + 1) % frames.length);
  }, [idx, frames]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const id = window.setInterval(() => setIdx((i) => (i + 1) % frames.length), FRAME_MS);
    return () => clearInterval(id);
  }, [playing, frames]);

  const fmtTime = (unix: number) =>
    new Date(unix * 1000).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: st.clock === '12h',
    });
  const isCast = idx >= pastCount;

  return (
    <div>
      <div className={s.title}>{t.radar.title}</div>
      <div className={s.hint}>{t.radar.hint}</div>
      {err ? (
        <div className={uiCss.empty}>{t.radar.unavailable}</div>
      ) : (
        <>
          <div ref={mapDiv} className={s.map} />
          {frames.length > 0 && (
            <div className={s.controls}>
              <button
                className={s.play}
                onClick={() => setPlaying((p) => !p)}
                aria-label={playing ? t.radar.pause : t.radar.play}
              >
                {playing ? '❚❚' : '▶'}
              </button>
              <input
                type="range"
                className={s.slider}
                min={0}
                max={frames.length - 1}
                value={idx}
                onChange={(e) => {
                  setPlaying(false);
                  setIdx(+e.target.value);
                }}
                aria-label={t.radar.title}
              />
              <span className={s.stamp} data-cast={isCast || undefined}>
                {fmtTime(frames[idx]?.time ?? 0)}
                {isCast && <em>{t.radar.proj}</em>}
              </span>
            </div>
          )}
          <div className={s.credit}>
            radar © <a href="https://www.rainviewer.com/">RainViewer</a>
          </div>
        </>
      )}
    </div>
  );
}
