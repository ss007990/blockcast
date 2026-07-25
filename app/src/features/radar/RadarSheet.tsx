// Radar & next-hours precipitation — a Windy.com embed centred on the
// current spot. The default view is the model rain animation for the hours
// ahead (MétéoMédia-style); flip to observed radar for what actually fell.
// Windy brings its own timeline/play controls, so the sheet stays thin.

import { useState } from 'react';
import { useT } from '../../hooks';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Segmented } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import s from './radar.module.css';

type Mode = 'cast' | 'obs';

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
  const [mode, setMode] = useState<Mode>('cast');
  const { lat, lon } = st.loc;
  const metric = st.units !== 'imperial';

  const src =
    'https://embed.windy.com/embed2.html' +
    `?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}` +
    '&zoom=8&level=surface&type=map&location=coordinates&marker=true&message=true&calendar=now' +
    `&metricWind=${metric ? 'km%2Fh' : 'mph'}&metricTemp=${metric ? '%C2%B0C' : '%C2%B0F'}` +
    (mode === 'cast' ? '&overlay=rain&product=ecmwf' : '&overlay=radar&product=radar');

  return (
    <div>
      <div className={s.title}>{t.radar.title}</div>
      <div className={s.modes}>
        <Segmented<Mode>
          options={[
            { value: 'cast', label: t.radar.modeCast },
            { value: 'obs', label: t.radar.modeObs },
          ]}
          value={mode}
          onChange={setMode}
          ariaLabel={t.radar.title}
        />
      </div>
      <div className={s.hint}>{mode === 'cast' ? t.radar.hintCast : t.radar.hintObs}</div>
      <iframe key={mode} className={s.frame} src={src} title={t.radar.title} loading="lazy" />
      <div className={s.credit}>
        <a href="https://www.windy.com/">Windy.com</a>
      </div>
    </div>
  );
}
