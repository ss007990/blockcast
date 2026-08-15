import { useEffect, useEffectEvent, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import { distKm, parseLocQuery, rankLocResults, type GeoResult } from '../../core/geo';
import { useIsMobile, useT } from '../../hooks';
import { reverseGeocode, searchPlaces } from '../../services/geocoding';
import { useGeo } from '../../state/geo';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Icon } from '../../ui/Icon';
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
  const geo = useGeo();
  const setLocOpen = useUi((u) => u.setLocOpen);
  // On phones, autofocusing the search field pops the keyboard the moment the
  // sheet opens — iOS then pans the sheet to keep the input above the keyboard,
  // landing the user on the map instead of the title and saved spots.
  const mobile = useIsMobile();

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
  const baseLayers = useRef<{ sat: TileLayer; osm: TileLayer } | null>(null);
  const [mapErr, setMapErr] = useState(false);
  // satellite by default — terrain beats street names for spotting a trail
  // head, a beach, a boat launch
  const [base, setBase] = useState<'sat' | 'map'>('sat');

  const switchBase = (b: 'sat' | 'map') => {
    const ls = baseLayers.current;
    const map = mapRef.current;
    if (!ls || !map || b === base) return;
    map.removeLayer(b === 'sat' ? ls.osm : ls.sat);
    (b === 'sat' ? ls.sat : ls.osm).addTo(map);
    setBase(b);
  };

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
          const raw = await searchPlaces(name, st.lang);
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
        const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 17,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        });
        const sat = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 17, attribution: '&copy; Esri, Maxar, Earthstar Geographics' },
        );
        sat.addTo(map);
        baseLayers.current = { sat, osm };
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

  const goLive = async () => {
    if (await geo.follow()) setLocOpen(false);
  };

  const following = st.loc.follow === true;
  const curSaved =
    !following && st.savedPlaces.some((p) => p.lat === st.loc.lat && p.lon === st.loc.lon);

  return (
    <div>
      <div className={s.title}>{t.location.set}</div>

      {geo.supported && (
        <div className={s.myLoc}>
          <button
            className={following ? `${s.myLocBtn} ${s.myLocOn}` : s.myLocBtn}
            aria-pressed={following}
            disabled={geo.status === 'locating'}
            onClick={() => void goLive()}
          >
            <Icon name="locate" size={16} />
            <span>
              {t.location.useMyLoc}
              {following && <small>{st.loc.name}</small>}
            </span>
          </button>
          {geo.status !== 'idle' && (
            <span className={s.myLocNote} role="status">
              {geo.status === 'locating'
                ? t.location.locating
                : geo.status === 'denied'
                  ? t.location.denied
                  : t.location.unavailable}
            </span>
          )}
        </div>
      )}

      <div className={s.spots}>
        <span className={s.spotsLabel}>{t.location.mySpots}</span>
        {st.savedPlaces.map((p) => {
          const cur = !following && p.lat === st.loc.lat && p.lon === st.loc.lon;
          return (
            <span key={`${p.lat}-${p.lon}`} className={cur ? `${s.spot} ${s.spotOn}` : s.spot}>
              <button
                className={s.spotGo}
                aria-current={cur || undefined}
                onClick={() => {
                  st.setLoc(p);
                  setLocOpen(false);
                }}
              >
                📍 {p.name}
              </button>
              <button
                className={s.spotX}
                aria-label={`${t.common.remove} ${p.name}`}
                onClick={() => st.toggleSavedPlace(p)}
              >
                ×
              </button>
            </span>
          );
        })}
        {!curSaved && (
          <button className={s.spotSave} onClick={() => st.toggleSavedPlace(st.loc)}>
            ☆ {t.location.saveSpot} — {st.loc.name}
          </button>
        )}
      </div>

      <input
        className={uiCss.input}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.location.searchPh}
        autoComplete="off"
        autoFocus={!mobile}
      />
      {results && (
        <div className={s.results}>
          {results.length === 0 ? (
            <div className={uiCss.empty}>{t.location.noMatch}</div>
          ) : (
            results.map((x) => {
              const kind = x.kind
                ? (t.location.kinds as Record<string, string | undefined>)[x.kind]
                : undefined;
              return (
                <button
                  key={`${x.latitude}-${x.longitude}`}
                  className={s.res}
                  onClick={() => choose(x.name, x.latitude, x.longitude)}
                >
                  {x.name}
                  {kind && <span className={s.resKind}>{kind}</span>}
                  <small>
                    {[x.admin1, x.country].filter(Boolean).join(', ')} ·{' '}
                    {Math.round(distKm(st.loc, { lat: x.latitude, lon: x.longitude }))} km
                  </small>
                </button>
              );
            })
          )}
        </div>
      )}

      <div className={s.hint}>{t.location.mapHint}</div>
      {mapErr ? (
        <div className={uiCss.empty}>{t.location.mapUnavail}</div>
      ) : (
        <div className={s.mapWrap}>
          <div ref={mapDiv} className={s.map} />
          <div className={s.layerToggle} role="group" aria-label={t.location.layerSat}>
            <button
              className={base === 'sat' ? s.layerOn : undefined}
              aria-pressed={base === 'sat'}
              onClick={() => switchBase('sat')}
            >
              {t.location.layerSat}
            </button>
            <button
              className={base === 'map' ? s.layerOn : undefined}
              aria-pressed={base === 'map'}
              onClick={() => switchBase('map')}
            >
              {t.location.layerMap}
            </button>
          </div>
        </div>
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
