# BlockCast

**Plan your sport around the sky.**

BlockCast splits your day into blocks (2/3/4/6 h) and scores each block of the coming week for your activity — tennis, cycling, jogging, fishing, golf, hiking, sailing, picnic, skiing, snowmobiling — as a simple green / yellow / red heat map.

## Features

- Live 7-day forecast from [Open-Meteo](https://open-meteo.com) (no API key needed)
- Per-activity criteria: rain, wind, cold, heat, UV, snow base, fresh snow — every weight tunable
- Adjustable comfort-temperature band, visible hours, and risk tolerance
- Pick a location by city search, browser geolocation, or a precise pin on the map (trails, lakes, mountains)
- Session planner with automatic forecast re-checks and calendar export (.ics)
- Settings and plans persist in the browser — no account, no tracking

## Running locally

It's a single self-contained `index.html` — no build step, no dependencies. Open it in a browser, or serve the folder:

```sh
ruby -run -e httpd . -p 8642
```

## Credits

Weather data by [Open-Meteo](https://open-meteo.com) · Maps by [Leaflet](https://leafletjs.com) & [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors
