import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

let listenersAttached = false;

export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if (!listenersAttached) {
      listenersAttached = true;

      PushNotifications.addListener('registration', async (token) => {
        const platform = Capacitor.getPlatform();
        const { error } = await supabase
          .from('profiles')
          .update({
            push_token: token.value,
            push_platform: platform,
            push_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (error) {
          console.error('[push] failed to store token:', error.message);
        } else {
          console.log('[push] token stored for', platform);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registration error:', JSON.stringify(err));
      });

      PushNotifications.addListener('pushNotificationReceived', (n) => {
        console.log('[push] received:', n.title);
      });
    }

    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      console.log('[push] permission not granted');
      return;
    }

    await PushNotifications.register();
  } catch (err) {
    console.error('[push] setup failed:', err);
  }
}
