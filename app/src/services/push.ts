// Web Push subscription against the BlockCast worker. The app is fully
// functional without the worker deployed — everything degrades to in-app
// alerts when push is unavailable.

import type { ActivityId, Criteria } from '../core/activities';
import type { PlannedSession } from '../core/alerts';
import type { Lang } from '../i18n';
import type { UnitSystem } from '../core/units';

const API = import.meta.env.VITE_PUSH_API as string | undefined;
const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushAvailability = 'ok' | 'unsupported' | 'unconfigured' | 'denied';

export function pushAvailability(): PushAvailability {
  if (!API || !VAPID_PUBLIC) return 'unconfigured';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

function urlB64ToUint8Array(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export interface PushContext {
  sessions: PlannedSession[];
  /** Resolved criteria per activity present in sessions. */
  critFor: (id: ActivityId) => Criteria;
  tolMult: number;
  lang: Lang;
  units: UnitSystem;
}

export async function subscribePush(ctx: PushContext): Promise<boolean> {
  if (pushAvailability() !== 'ok') return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC!).buffer as ArrayBuffer,
  });
  const criteria: Record<string, { w: Criteria['weights']; tMin: number; tMax: number }> = {};
  for (const s of ctx.sessions) {
    if (criteria[s.activityId]) continue;
    const c = ctx.critFor(s.activityId);
    criteria[s.activityId] = { w: c.weights, tMin: c.tMin, tMax: c.tMax };
  }
  const res = await fetch(`${API}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      subscription: sub.toJSON(),
      sessions: ctx.sessions.map((s) => ({ ...s, locName: s.locName })),
      criteria,
      tolMult: ctx.tolMult,
      lang: ctx.lang,
      units: ctx.units,
    }),
  });
  return res.ok;
}

export async function unsubscribePush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  if (API)
    await fetch(`${API}/api/subscribe`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
  await sub.unsubscribe();
}
