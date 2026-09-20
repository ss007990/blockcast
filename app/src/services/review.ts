// Ask for an App Store rating once, at the moment the user has shown they
// trust the scoring: their second planned session. iOS decides whether the
// prompt actually appears (at most three times a year per app), so the call
// is fire-and-forget. Web builds never ask.

import { Capacitor } from '@capacitor/core';
import { useSettings } from '../state/settings';

export const REVIEW_AT_SESSION = 2;

export async function maybeAskForReview(sessionCount: number): Promise<void> {
  const st = useSettings.getState();
  if (st.reviewAsked || sessionCount < REVIEW_AT_SESSION) return;
  if (!Capacitor.isNativePlatform()) return;
  st.setReviewAsked();
  try {
    const { InAppReview } = await import('@capacitor-community/in-app-review');
    await InAppReview.requestReview();
  } catch {
    // the sheet did not show; iOS gets no second chance by design
  }
}
