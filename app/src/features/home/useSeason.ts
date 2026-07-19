import { useMemo } from 'react';
import { isoDate, locNow } from '../../core/forecast';
import { isWinter, seasonSignals } from '../../core/season';
import { useNowMs } from '../../hooks';
import { useForecast } from '../../state/forecast';
import { useSettings } from '../../state/settings';

/** Is the coming week "winter" at the current location? */
export function useSeason(): boolean {
  const data = useForecast((f) => f.data);
  const lat = useSettings((s) => s.loc.lat);
  const nowMs = useNowMs();
  return useMemo(() => {
    if (!data) return false;
    return isWinter(seasonSignals(data, lat, isoDate(locNow(data, nowMs))));
  }, [data, lat, nowMs]);
}
