import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

/**
 * Registers the device for push notifications and stores the token in Supabase.
 * Only runs on native platforms (iOS/Android) — no-op on web.
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  // Only run on native — web uses a different notification strategy
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Request permission
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.log('[push] permission not granted');
      return;
    }

    // Register with APNs / FCM
    await PushNotifications.register();

    // Listen for the registration token
    PushNotifications.addListener('registration', async (token) => {
      console.log('[push] device token:', token.value);
      // Store token in the user's profile
      const platform = Capacitor.getPlatform(); // 'ios' or 'android'
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

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[push] registration error:', err.error);
    });

    // Handle notification received while app is in foreground
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[push] received in foreground:', notification.title);
    });

    // Handle notification tapped
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[push] tapped:', action.notification.title);
      // Future: navigate to relevant screen based on notification.data.type
    });

  } catch (err) {
    console.error('[push] setup failed:', err);
  }
}
