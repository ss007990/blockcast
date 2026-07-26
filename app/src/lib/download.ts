import { Capacitor } from '@capacitor/core';
import type { ActivityId } from '../core/activities';
import type { PlannedSession } from '../core/alerts';
import type { IcsEvent } from '../core/ics';
import type { BlockResult } from '../core/forecast';
import type { Dict } from '../i18n';

export function sessionToIcsEvent(
  p: PlannedSession,
  b: BlockResult | null,
  t: Dict,
  nameOf: (id: ActivityId) => string,
): IcsEvent {
  const forecast = b
    ? `Forecast: risk ${b.score}/100 (${t.risk[b.band]}). Rain ${b.f.rainProb}%/${b.f.rainSum}mm, wind ${b.f.wind}km/h (gusts ${b.f.gust}), feels ${b.f.temp}C, UV ${b.f.uv}. — BlockCast`
    : 'Planned with BlockCast';
  return {
    uid: `${p.id}-${p.day.replace(/-/g, '')}${String(p.h).padStart(2, '0')}@blockcast`,
    day: p.day,
    h: p.h,
    len: p.len,
    summary: p.purpose
      ? `${nameOf(p.activityId)} — ${t.planner.purposes[p.purpose]}`
      : `${nameOf(p.activityId)} — BlockCast`,
    location: p.locName,
    description: p.note ? `${p.note}\n${forecast}` : forecast,
  };
}

export function downloadFile(content: string, filename: string, mime: string): void {
  if (Capacitor.isNativePlatform()) {
    // No download manager in the native WebView — write the file and hand it
    // to the iOS share sheet, which offers "Add to Calendar" for .ics.
    void shareFileNative(content, filename);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function shareFileNative(content: string, filename: string): Promise<void> {
  try {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const file = await Filesystem.writeFile({
      path: filename,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ url: file.uri });
  } catch {
    // user dismissed the share sheet — nothing to clean up
  }
}
