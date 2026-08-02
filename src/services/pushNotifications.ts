// src/services/pushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const SEND_PUSH_URL = '/.netlify/functions/send-push';

let listenersAttached = false;

// Shows the OS permission dialog if needed. Returns true if granted.
export async function requestPushPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    return perm.receive === 'granted';
  } catch (err) {
    console.error('[push] requestPushPermission failed:', err);
    return false;
  }
}

// Registers the token if permission is already granted — never triggers the OS prompt.
export async function registerPushToken(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await PushNotifications.checkPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.register();

    // Guard against duplicate listeners when called on every loadProfile
    if (listenersAttached) return;
    listenersAttached = true;

    PushNotifications.addListener('registration', async (token) => {
      const platform = Capacitor.getPlatform() as 'ios' | 'android';
      await supabase.from('push_tokens').upsert({
        user_id:    userId,
        token:      token.value,
        platform,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,platform' });
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error:', err);
    });

    // When user taps the notification, navigate to the right screen
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification.data;
      window.dispatchEvent(new CustomEvent('biocycle:push-tap', { detail: data }));
    });

  } catch (err) {
    console.error('[push] registerPushToken failed:', err);
  }
}

// Backward-compatible: request permission then register. Existing callers unchanged.
export async function registerPushNotifications(userId: string): Promise<void> {
  const granted = await requestPushPermission();
  if (granted) await registerPushToken(userId);
}

// Call this to send the daily card push to a user
export async function sendDailyCardPush(userId: string): Promise<void> {
  try {
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (error || !tokens?.length) return;

    await Promise.allSettled(
      tokens.map(({ token, platform }) =>
        fetch(SEND_PUSH_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            push_type: 'daily_card',
            user_id:   userId,
            token,
            platform,
          }),
        })
      )
    );
  } catch (err) {
    console.error('[push] sendDailyCardPush failed:', err);
  }
}

// For milestone, re-engagement, compatibility pushes — pass title + body directly.
// Returns true if a push was dispatched to at least one token, false otherwise.
export async function sendSystemPush(
  userId: string,
  title:  string,
  body:   string,
  data?:  Record<string, string>
): Promise<boolean> {
  try {
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (error || !tokens?.length) return false;

    await Promise.allSettled(
      tokens.map(({ token, platform }) =>
        fetch(SEND_PUSH_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, platform, title, body, data }),
        })
      )
    );
    return true;
  } catch (err) {
    console.error('[push] sendSystemPush failed:', err);
    return false;
  }
}
