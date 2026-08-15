// Bottom-of-page detail tiles: UV, wind, humidity, daylight. Each pairs the
// number with a one-line consequence rather than a bare value.

import { motion } from 'framer-motion';
import type { HourSlice } from '../../core/scoring';
import { formatHour, formatSpeed, formatTemp } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtIsoTime } from '../../lib/format';
import type { AirQuality } from '../../services/airQuality';
import { useSettings } from '../../state/settings';
import s from './home.module.css';

interface Props {
  daySlices: (HourSlice | undefined)[];
  nowH: number;
  /** Local "now" as epoch ms — a primitive, so the caller's Date stays put. */
  nowTime: number;
  sunrise: string | undefined;
  sunset: string | undefined;
  aqhi: AirQuality | null;
}

export function TilesGrid({ daySlices, nowH, nowTime, sunrise, sunset, aqhi }: Props) {
  const t = useT();
  const locale = useLocale();
  const { units, clock } = useSettings();

  const cur = daySlices[nowH];
  const rest: { h: number; s: HourSlice }[] = [];
  for (let h = nowH; h < 24; h++) {
    const sl = daySlices[h];
    if (sl) rest.push({ h, s: sl });
  }

  // UV: today's remaining peak + how long protection is warranted
  const uvMax = Math.max(0, ...rest.map((r) => r.s.uv));
  const uvWord = [t.home.uv0, t.home.uv1, t.home.uv2, t.home.uv3, t.home.uv4][
    uvMax < 3 ? 0 : uvMax < 6 ? 1 : uvMax < 8 ? 2 : uvMax < 11 ? 3 : 4
  ];
  const lastUv = rest.filter((r) => r.s.uv >= 3).at(-1);
  const uvSub = lastUv
    ? fill(t.home.uvAdvice, { time: formatHour(Math.min(23, lastUv.h + 1), clock) })
    : t.home.uvNone;

  // wind: right now, plus the strongest gust still to come
  const peak = rest.reduce<{ h: number; v: number } | null>(
    (a, r) => (a == null || r.s.gust > a.v ? { h: r.h, v: r.s.gust } : a),
    null,
  );
  const windSub =
    peak && peak.v >= 30
      ? fill(t.home.gustsTo, {
          v: formatSpeed(peak.v, units),
          time: formatHour(peak.h, clock),
        })
      : t.home.calmDay;

  // humidity: dew point tells the comfort story better than RH alone
  const dew = cur?.dew;
  const dewWord =
    dew == null
      ? ''
      : [t.home.dew0, t.home.dew1, t.home.dew2, t.home.dew3][
          dew < 10 ? 0 : dew < 16 ? 1 : dew < 21 ? 2 : 3
        ];
  const humSub =
    dew != null ? `${fill(t.home.dewPoint, { t: formatTemp(dew, units) })} · ${dewWord}` : '';

  // daylight left until sunset
  const sunsetDate = sunset ? new Date(sunset) : null;
  const daylightH =
    sunsetDate && sunsetDate.getTime() > nowTime
      ? Math.round(((sunsetDate.getTime() - nowTime) / 36e5) * 10) / 10
      : 0;
  const sunTimes =
    sunrise && sunset
      ? `${fmtIsoTime(sunrise, locale, clock)} → ${fmtIsoTime(sunset, locale, clock)}`
      : '';

  // AQHI (Canadian 1–10+ scale): promoted to a full-width alert tile when
  // high; otherwise it takes the daylight tile's slot (sun times already
  // live in the hero footer)
  const aqhiTile = aqhi
    ? {
        lbl: t.home.tileAqhi,
        val: `${aqhi.aqhi >= 11 ? '11+' : aqhi.aqhi} · ${[t.home.aqhi0, t.home.aqhi1, t.home.aqhi2, t.home.aqhi3][aqhi.risk]}`,
        sub: [t.home.aqhiSub0, t.home.aqhiSub1, t.home.aqhiSub2, t.home.aqhiSub3][aqhi.risk],
        alert: aqhi.risk >= 2,
      }
    : null;

  const sunTile = {
    lbl: t.home.tileSun,
    val: daylightH > 0 ? fill(t.home.daylightLeft, { h: String(daylightH) }) : '🌙',
    sub: sunTimes,
  };

  const tiles = [
    ...(aqhiTile?.alert ? [aqhiTile] : []),
    { lbl: t.home.tileUv, val: `${uvMax.toFixed(0)} · ${uvWord}`, sub: uvSub },
    {
      lbl: t.home.tileWind,
      val: cur ? formatSpeed(cur.wind, units) : '–',
      sub: windSub,
    },
    {
      lbl: t.home.tileHumidity,
      val: cur?.rh != null ? `${Math.round(cur.rh)}%` : '–',
      sub: humSub,
    },
    aqhiTile && !aqhiTile.alert ? aqhiTile : sunTile,
  ];

  return (
    <motion.section
      className={s.tiles}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.14 }}
    >
      {tiles.map((tile) => (
        <div
          key={tile.lbl}
          className={s.tile}
          data-alert={('alert' in tile && tile.alert) || undefined}
        >
          <span className={s.tileLbl}>{tile.lbl}</span>
          <b className={s.tileVal}>{tile.val}</b>
          <span className={s.tileSub}>{tile.sub}</span>
        </div>
      ))}
    </motion.section>
  );
}
