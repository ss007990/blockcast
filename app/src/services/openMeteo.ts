import { reshapeForecast, type ForecastData, type OpenMeteoResponse } from '../core/forecast';

const PAST_DAYS = 2; // needed to compute fresh snow over the last 48 h

export async function fetchForecast(lat: number, lon: number): Promise<ForecastData> {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: 'auto',
    forecast_days: '7',
    past_days: String(PAST_DAYS),
    hourly:
      'temperature_2m,apparent_temperature,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cloud_cover,uv_index,snowfall,snow_depth',
    daily: 'weather_code,apparent_temperature_max,apparent_temperature_min,sunrise,sunset',
  }).toString();
  const res = await fetch(u);
  if (!res.ok) throw new Error(`Weather API error ${res.status}`);
  const j = (await res.json()) as OpenMeteoResponse;
  return reshapeForecast(j, PAST_DAYS);
}
