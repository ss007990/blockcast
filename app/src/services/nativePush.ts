// APNs subscription for the native iOS shell. Mirrors the Web Push flow in
// push.ts — same worker endpoint, but the body carries an APNs device token
// instead of a PushSubscription. Loaded only on native (dynamic plugin import).

const API = import.meta.env.VITE_PUSH_API as string | undefined;
const TOKEN_KEY = 'blockcast.v2.apnsToken';

/** Resolves with the device token, or null on permission denial / timeout. */
async function registerForToken(): Promise<string | null> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
  if (perm.receive !== 'granted') return null;

  return new Promise<string | null>((resolve) => {
    // registration is normally instant; 10 s covers a slow first APNs roundtrip
    const timer = setTimeout(() => resolve(null), 10_000);
    void PushNotifications.addListener('registration', (t) => {
      clearTimeout(timer);
      resolve(t.value);
    });
    void PushNotifications.addListener('registrationError', () => {
      clearTimeout(timer);
      resolve(null);
    });
    void PushNotifications.register();
  });
}

export async function nativePushDenied(): Promise<boolean> {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  return (await PushNotifications.checkPermissions()).receive === 'denied';
}

export async function subscribeNativePush(body: object): Promise<boolean> {
  if (!API) return false;
  const token = await registerForToken();
  if (!token) return false;
  const res = await fetch(`${API}/api/subscribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, apns: { token } }),
  });
  if (res.ok) localStorage.setItem(TOKEN_KEY, token);
  return res.ok;
}

export async function unsubscribeNativePush(): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  if (API)
    await fetch(`${API}/api/subscribe`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apnsToken: token }),
    }).catch(() => {});
  localStorage.removeItem(TOKEN_KEY);
}
