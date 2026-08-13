// Radar & next-hours precipitation. The default tab is the future radar
// (ECCC observed past hour + ECCC extrapolation nowcast + HRDPS model out
// to 6 h, auto-playing, MétéoMédia-style); the other tabs are Windy.com
// embeds with their own timeline. Windy's embed cannot auto-play or blend
// radar with forecast, which is why the default view is built in-app from
// GeoMet.

import { useState } from 'react';
import { useT } from '../../hooks';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Segmented } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import { FutureRadar } from './FutureRadar';
import s from './radar.module.css';

type Mode = 'radar' | 'rain' | 'wind' | 'waves';

const OVERLAY: Record<Exclude<Mode, 'radar'>, string> = {
  rain: '&overlay=rain&product=ecmwf',
  wind: '&overlay=wind&product=ecmwf',
  waves: '&overlay=waves',
};

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
  const st = useSettings();
  const [mode, setMode] = useState<Mode>('radar');
  const { lat, lon } = st.loc;
  const metric = st.units !== 'imperial';

  const src =
    mode === 'radar'
      ? ''
      : 'https://embed.windy.com/embed2.html' +
        `?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}` +
        '&zoom=8&level=surface&type=map&location=coordinates&marker=true&message=true&calendar=now' +
        `&metricWind=${metric ? 'km%2Fh' : 'mph'}&metricTemp=${metric ? '%C2%B0C' : '%C2%B0F'}` +
        OVERLAY[mode];

  const hint = {
    radar: t.radar.hintRadar,
    rain: t.radar.hintRain,
    wind: t.radar.hintWind,
    waves: t.radar.hintWaves,
  }[mode];

  return (
    <div>
      <div className={s.title}>{t.radar.title}</div>
      <div className={s.modes}>
        <Segmented<Mode>
          options={[
            { value: 'radar', label: t.radar.modeRadar },
            { value: 'rain', label: t.radar.modeRain },
            { value: 'wind', label: t.radar.modeWind },
            { value: 'waves', label: t.radar.modeWaves },
          ]}
          value={mode}
          onChange={setMode}
          ariaLabel={t.radar.title}
        />
      </div>
      <div className={s.hint}>{hint}</div>
      {mode === 'radar' ? (
        <FutureRadar />
      ) : (
        <iframe key={mode} className={s.frame} src={src} title={t.radar.title} loading="lazy" />
      )}
      <div className={s.credit}>
        {mode === 'radar' ? (
          <>
            <a href="https://eccc-msc.github.io/open-data/">ECCC GeoMet</a>
            {' · '}
            <a href="https://openfreemap.org/">OpenFreeMap</a>
            {' · © '}
            <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>
          </>
        ) : (
          <a href="https://www.windy.com/">Windy.com</a>
        )}
      </div>
    </div>
  );
}
