import admin from 'firebase-admin';

let messaging: admin.messaging.Messaging | null = null;

export function getMessaging(): admin.messaging.Messaging | null {
  if (messaging) return messaging;

  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    console.warn('[firebase] FIREBASE_SERVICE_ACCOUNT_JSON not set — FCM disabled');
    return null;
  }
  try {
    const serviceAccount = JSON.parse(json);
    const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = app.messaging();
    console.log('[firebase] initialized for project:', serviceAccount.project_id);
  } catch (err) {
    console.error('[firebase] init error:', err);
  }
  return messaging;
}
