import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

let listenersAttached = false;

// Temporary on-screen debug — shows push status in the app
export function setPushDebug(msg: string) {
  (window as any).__pushDebug = msg;
  window.dispatchEvent(new CustomEvent('pushDebugUpdate', { detail: msg }));
}

/**
 * Registers the device for push notifications and stores the token in Supabase.
 * Only runs on native platforms (iOS/Android) — no-op on web.
 *
 * CRITICAL: listeners must be attached BEFORE calling register(), because the
 * 'registration' event can fire immediately — before a later-attached listener exists.
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. Attach listeners FIRST (only once per app lifetime)
    if (!listenersAttached) {
      listenersAttached = true;

      PushNotifications.addListener('registration', async (token) => {
        console.log('[push] device token received:', token.value);
        setPushDebug('token received: ' + token.value.substring(0, 20) + '...');
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
          setPushDebug('STORE FAILED: ' + error.message);
        } else {
          console.log('[push] token stored successfully for', platform);
          setPushDebug('TOKEN STORED OK: ' + platform);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[push] registration error:', JSON.stringify(err));
        setPushDebug('REG ERROR: ' + JSON.stringify(err));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('[push] received in foreground:', notification.title);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('[push] tapped:', action.notification.title);
      });
    }

    // 2. Check / request permission
    let permStatus = await PushNotifications.checkPermissions();
    console.log('[push] permission status:', permStatus.receive);
    setPushDebug('permission: ' + permStatus.receive);

    if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
      permStatus = await PushNotifications.requestPermissions();
      console.log('[push] permission after request:', permStatus.receive);
      setPushDebug('permission after request: ' + permStatus.receive);
    }

    if (permStatus.receive !== 'granted') {
      console.log('[push] permission not granted — cannot register');
      setPushDebug('permission not granted — cannot register');
      return;
    }

    // 3. NOW register — listeners are already in place to catch the token
    console.log('[push] calling register()...');
    setPushDebug('calling register()...');
    await PushNotifications.register();
    console.log('[push] register() called, awaiting token event');
    setPushDebug('register() called, awaiting token...');

  } catch (err) {
    console.error('[push] setup failed:', err);
    setPushDebug('SETUP FAILED: ' + String(err));
  }
}
