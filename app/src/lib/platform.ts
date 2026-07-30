// Apple devices (iPhone, iPad, Mac) hand webcal:// links straight to the
// Calendar app, so the subscribe flow is the one-tap path there. Elsewhere
// Google/Outlook lead. iPadOS 13+ reports itself as "Macintosh", which is
// fine — both land in the Apple bucket.
export function isApplePlatform(ua: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua);
}
