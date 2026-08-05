// Nearby live cams — the closest Windy webcams around the current spot,
// pinned on a mini map. A cam with a live stream embeds Windy's player;
// the rest show their latest still (most cams refresh every few minutes),
// which is the honest ground truth the forecast can't give.

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { distKm } from '../../core/geo';
import { useT } from '../../hooks';
import { fetchNearbyWebcams, type Webcam } from '../../services/webcams';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { uiCss } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import s from './cams.module.css';

export function CamsSheet() {
  const { camsOpen, setCamsOpen } = useUi();
  const t = useT();
  return (
    <Sheet open={camsOpen} onClose={() => setCamsOpen(false)} ariaLabel={t.cams.title}>
      {camsOpen && <CamsContent />}
    </Sheet>
  );
}

function CamsContent() {
  const t = useT();
  const loc = useSettings((st) => st.loc);

  const [cams, setCams] = useState<Webcam[] | null | 'loading'>('loading');
  const [current, setCurrent] = useState<Webcam | null>(null);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const camPins = useRef<Marker[]>([]);
  const [mapErr, setMapErr] = useState(false);

  useEffect(() => {
    let disposed = false;
    void fetchNearbyWebcams(loc.lat, loc.lon).then((list) => {
      if (disposed) return;
      setCams(list);
      setCurrent(list?.[0] ?? null);
    });
    return () => {
      disposed = true;
    };
  }, [loc.lat, loc.lon]);

  // The map container only exists once cams have arrived, so the lazy
  // Leaflet init has to run on the cams transition, not on mount.
  useEffect(() => {
    if (!Array.isArray(cams) || cams.length === 0) return;
    let disposed = false;
    void (async () => {
      try {
        if (!mapRef.current) {
          await import('leaflet/dist/leaflet.css');
          const L = (await import('leaflet')).default;
          if (disposed || !mapDiv.current || mapRef.current) return;
          const map = L.map(mapDiv.current, { scrollWheelZoom: false }).setView(
            [loc.lat, loc.lon],
            9,
          );
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 17,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(map);
          L.marker([loc.lat, loc.lon], {
            icon: L.divIcon({ className: 'bc-pin', html: '📍', iconSize: [24, 24], iconAnchor: [12, 22] }),
          }).addTo(map);
          leafletRef.current = L;
          mapRef.current = map;
        }
        const L = leafletRef.current;
        const map = mapRef.current;
        if (disposed || !L || !map) return;
        camPins.current.forEach((m) => m.remove());
        camPins.current = cams.map((c) =>
          L.marker([c.lat, c.lon], {
            icon: L.divIcon({ className: 'bc-pin', html: '🎥', iconSize: [24, 24], iconAnchor: [12, 12] }),
          })
            .addTo(map)
            .on('click', () => setCurrent(c)),
        );
        const b = L.latLngBounds([
          [loc.lat, loc.lon],
          ...cams.map((c) => [c.lat, c.lon] as [number, number]),
        ]);
        // the sheet may still be animating open: size the map after layout
        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(b, { padding: [24, 24], maxZoom: 12 });
        }, 60);
      } catch {
        if (!disposed) setMapErr(true);
      }
    })();
    return () => {
      disposed = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cams]);

  // tear the map down with the sheet
  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      camPins.current = [];
    },
    [],
  );

  const player = current ? (current.live ?? current.day) : undefined;

  return (
    <div>
      <div className={s.title}>{t.cams.title}</div>

      {cams === 'loading' && <div className={uiCss.empty}>{t.cams.loading}</div>}
      {cams === null && <div className={uiCss.empty}>{t.cams.unavailable}</div>}
      {Array.isArray(cams) && cams.length === 0 && (
        <div className={uiCss.empty}>{t.cams.none}</div>
      )}

      {Array.isArray(cams) && cams.length > 0 && (
        <>
          {!mapErr && <div ref={mapDiv} className={s.map} />}

          {current && (
            <div className={s.viewer}>
              <div className={s.meta}>
                <b>{current.title}</b>
                <span>
                  {current.place ? `${current.place} · ` : ''}
                  {Math.round(distKm(loc, current))} km
                  {current.live && <em className={s.liveBadge}> {t.cams.live}</em>}
                </span>
              </div>
              {player ? (
                <iframe key={current.id} className={s.frame} src={player} title={current.title} loading="lazy" allowFullScreen />
              ) : (
                <img key={current.id} className={s.frame} src={current.preview} alt={current.title} />
              )}
              {current.detail && (
                <a className={s.detailLink} href={current.detail} target="_blank" rel="noreferrer">
                  {t.cams.viewOnWindy} ↗
                </a>
              )}
            </div>
          )}

          <div className={s.thumbs}>
            {cams.map((c) => (
              <button
                key={c.id}
                className={s.thumb}
                aria-pressed={current?.id === c.id}
                onClick={() => setCurrent(c)}
              >
                <img src={c.thumb} alt="" loading="lazy" />
                <span className={s.thumbCap}>
                  {c.title}
                  <small>{Math.round(distKm(loc, c))} km</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <div className={s.credit}>
        {t.cams.credit} <a href="https://www.windy.com/webcams">Windy.com</a>
      </div>
    </div>
  );
}
