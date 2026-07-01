// src/services/pushNotifications.ts
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const SEND_PUSH_URL = '/.netlify/functions/send-push';

export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;

    await PushNotifications.register();

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
    console.error('[push] registration failed:', err);
  }
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

// For milestone, re-engagement, compatibility pushes — pass title + body directly
export async function sendSystemPush(
  userId: string,
  title:  string,
  body:   string,
  data?:  Record<string, string>
): Promise<void> {
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
          body: JSON.stringify({ token, platform, title, body, data }),
        })
      )
    );
  } catch (err) {
    console.error('[push] sendSystemPush failed:', err);
  }
}
