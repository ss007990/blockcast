import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import { distKm, parseLocQuery, rankLocResults, type GeoResult } from '../../core/geo';
import { useT } from '../../hooks';
import { reverseGeocode, searchCities } from '../../services/geocoding';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Button, uiCss } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import s from './location.module.css';

export function LocationSheet() {
  const { locOpen, setLocOpen } = useUi();
  const t = useT();
  return (
    <Sheet open={locOpen} onClose={() => setLocOpen(false)} ariaLabel={t.location.set}>
      {locOpen && <LocationContent />}
    </Sheet>
  );
}

function LocationContent() {
  const t = useT();
  const st = useSettings();
  const setLocOpen = useUi((u) => u.setLocOpen);

  const [q, setQ] = useState('');
  const [results, setResults] = useState<GeoResult[] | null>(null);
  const [pick, setPick] = useState<{ lat: number; lon: number } | null>(null);
  const [pickName, setPickName] = useState('');
  const [naming, setNaming] = useState(false);
  const nameEdited = useRef(false);
  const pickToken = useRef(0);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [mapErr, setMapErr] = useState(false);

  const choose = (name: string, lat: number, lon: number) => {
    st.setLoc({ name, lat: +lat.toFixed(4), lon: +lon.toFixed(4) });
    setLocOpen(false);
  };

  // debounced city search
  useEffect(() => {
    const query = q.trim();
    const timer = setTimeout(
      async () => {
        if (query.length < 2) {
          setResults(null);
          return;
        }
        const { name, qual } = parseLocQuery(query);
        try {
          const raw = await searchCities(name, st.lang);
          setResults(rankLocResults(raw, name, qual, st.loc).slice(0, 8));
        } catch {
          setResults([]);
        }
      },
      query.length < 2 ? 0 : 300,
    );
    return () => clearTimeout(timer);
  }, [q, st.lang, st.loc]);

  // record the picked coordinates and reverse-geocode a suggested name
  const applyPick = useEffectEvent(async (lat: number, lon: number) => {
    setPick({ lat, lon });
    // best-effort reverse geocode; the field stays editable
    nameEdited.current = false;
    setPickName('');
    setNaming(true);
    const token = ++pickToken.current;
    const name = await reverseGeocode(lat, lon, st.lang);
    if (token !== pickToken.current || nameEdited.current) return;
    setNaming(false);
    setPickName(name || `${lat}, ${lon}`);
  });

  // place (or move) the draggable pin, then apply the pick
  const onPick = useEffectEvent(
    (L: typeof import('leaflet'), map: LeafletMap, latRaw: number, lonRaw: number) => {
      const lat = +latRaw.toFixed(4);
      const lon = +lonRaw.toFixed(4);
      if (markerRef.current) markerRef.current.setLatLng([lat, lon]);
      else {
        const m = L.marker([lat, lon], {
          draggable: true,
          icon: L.divIcon({
            className: 'bc-pin',
            html: '📍',
            iconSize: [24, 24],
            iconAnchor: [12, 22],
          }),
        }).addTo(map);
        m.on('dragend', () => {
          const p = m.getLatLng();
          void applyPick(+p.lat.toFixed(4), +p.lng.toFixed(4));
        });
        markerRef.current = m;
      }
      void applyPick(lat, lon);
    },
  );

  // lazy Leaflet map — loaded only while this sheet is open
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        await import('leaflet/dist/leaflet.css');
        const L = (await import('leaflet')).default;
        if (disposed || !mapDiv.current || mapRef.current) return;
        const map = L.map(mapDiv.current).setView([st.loc.lat, st.loc.lon], 9);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
        map.on('click', (e) => void onPick(L, map, e.latlng.lat, e.latlng.lng));
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 50);
      } catch {
        if (!disposed) setMapErr(true);
      }
    })();
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => choose(t.location.myLoc, pos.coords.latitude, pos.coords.longitude),
      () => {},
      { timeout: 6000 },
    );
  };

  return (
    <div>
      <div className={s.title}>{t.location.set}</div>
      <input
        className={uiCss.input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.location.searchPh}
        autoComplete="off"
        autoFocus
      />
      {results && (
        <div className={s.results}>
          {results.length === 0 ? (
            <div className={uiCss.empty}>{t.location.noMatch}</div>
          ) : (
            results.map((x) => (
              <button
                key={`${x.latitude}-${x.longitude}`}
                className={s.res}
                onClick={() => choose(x.name, x.latitude, x.longitude)}
              >
                {x.name}
                <small>
                  {[x.admin1, x.country].filter(Boolean).join(', ')} ·{' '}
                  {Math.round(distKm(st.loc, { lat: x.latitude, lon: x.longitude }))} km
                </small>
              </button>
            ))
          )}
        </div>
      )}

      {'geolocation' in navigator && (
        <div className={s.myLoc}>
          <Button variant="ghost" onClick={useMyLocation}>
            📍 {t.location.useMyLoc}
          </Button>
        </div>
      )}

      <div className={s.hint}>{t.location.mapHint}</div>
      {mapErr ? (
        <div className={uiCss.empty}>{t.location.mapUnavail}</div>
      ) : (
        <div ref={mapDiv} className={s.map} />
      )}

      {pick && (
        <div className={s.pickBar}>
          <input
            className={uiCss.input}
            value={pickName}
            placeholder={naming ? t.location.naming : t.location.namePh}
            onChange={(e) => {
              nameEdited.current = true;
              setPickName(e.target.value);
            }}
          />
          <span className={s.coords}>
            {pick.lat}, {pick.lon}
          </span>
          <Button
            onClick={() => choose(pickName.trim() || `${pick.lat}, ${pick.lon}`, pick.lat, pick.lon)}
          >
            {t.location.useSpot}
          </Button>
        </div>
      )}
    </div>
  );
}
