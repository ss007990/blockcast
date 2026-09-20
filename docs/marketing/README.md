# Marketing screenshots

One Week heat map per sport, for community posts (Reddit, Product Hunt, club
groups). Not App Store assets; those live in `../appstore/`.

Captured Sept 20, 2026 from the 1.1 (build 12) code on the iPhone 17 Pro Max
simulator, 1320 x 2868, 9:41 status bar, metric, 24 h clock, live forecast.

| File | Location | Where to use it |
| --- | --- | --- |
| `week-tennis.png` | Québec | r/10s, Tennis Québec |
| `week-golf.png` | Québec | r/golf, Golf Québec |
| `week-cycling.png` | Québec | r/cycling, Vélo Québec |
| `week-jogging.png` | Québec | r/running |
| `week-sailing.png` | Québec | r/sailing |
| `week-fishing.png` | Québec | r/Fishing |
| `week-skiing.png` | Valle Nevado, Chile | ski posts at first snowfall |
| `week-snowmobiling.png` | Valle Nevado, Chile | snowmobile posts at first snowfall |

The two snow shots use a Chilean resort because nowhere in Canada had a snow
base in September; recapture them from a Québec hill once the season starts
so the location label matches the audience.

## Recipe

1. `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ../DerivedData build` (from `app/`)
2. `xcrun simctl boot <udid>` then `xcrun simctl status_bar <udid> override --time 9:41 --batteryLevel 100 --batteryState charged --wifiBars 3 --cellularBars 4`
3. `xcrun simctl install <udid> ../DerivedData/Build/Products/Release-iphonesimulator/App.app` and launch `ca.blockcast.app`
4. Week tab, pick the sport, dismiss the quick-toggle chips so the header is one row, then `xcrun simctl io <udid> screenshot week-<sport>.png`

If the Week heading shows the previous sport's name after a switch, bounce
Today then Week to force a repaint. If the layout looks zoomed after using
the location search, relaunch the app.
