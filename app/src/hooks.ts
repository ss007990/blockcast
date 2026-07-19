import { useEffect, useState, useSyncExternalStore } from 'react';
import type { ActivityId } from './core/activities';
import { DICTS, localeOf, type Dict } from './i18n';
import { useSettings } from './state/settings';

/** The active dictionary. */
export const useT = (): Dict => DICTS[useSettings((s) => s.lang)];

/** Display name for any activity id: localized preset name or the custom
 * activity's user-given name (the raw id as a last resort). */
export function useActivityName(): (id: ActivityId) => string {
  const t = useT();
  const customs = useSettings((s) => s.customActivities);
  return (id) =>
    (t.activities as Record<string, string | undefined>)[id] ??
    customs.find((c) => c.id === id)?.name ??
    id;
}

/** The active BCP-47 locale for Intl formatting. */
export const useLocale = (): string => localeOf(useSettings((s) => s.lang));

// The wall clock as an external store: render-pure, ticking once a minute.
const clockListeners = new Set<() => void>();
let clockNow = Date.now();
let clockTimer: number | undefined;
const subscribeClock = (cb: () => void) => {
  clockListeners.add(cb);
  clockTimer ??= window.setInterval(() => {
    clockNow = Date.now();
    clockListeners.forEach((l) => l());
  }, 60_000);
  return () => {
    clockListeners.delete(cb);
    if (!clockListeners.size && clockTimer !== undefined) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
};

/** Current epoch ms, refreshed every minute. */
export const useNowMs = (): number => useSyncExternalStore(subscribeClock, () => clockNow);

export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatch(m.matches);
    m.addEventListener('change', on);
    on();
    return () => m.removeEventListener('change', on);
  }, [query]);
  return match;
}

export const useIsMobile = (): boolean => useMedia('(max-width: 760px)');

/** Apply the theme choice to <html data-theme> and keep it in sync with the OS. */
export function useThemeEffect(): void {
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    const sys = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (sys.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    sys.addEventListener('change', apply);
    return () => sys.removeEventListener('change', apply);
  }, [theme]);
}
