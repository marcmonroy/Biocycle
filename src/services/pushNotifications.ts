import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '../lib/supabase';

export function setPushDebug(msg: string) {
  (window as any).__pushDebug = msg;
  window.dispatchEvent(new CustomEvent('pushDebugUpdate', { detail: msg }));
}

let listenersAttached = false;

/**
 * Registers for push via @capacitor-firebase/messaging — returns an FCM token
 * directly (handles the APNs→FCM exchange natively on iOS).
 */
export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Attach token listener once
    if (!listenersAttached) {
      listenersAttached = true;

      await FirebaseMessaging.addListener('tokenReceived', async (event) => {
        const token = event.token;
        setPushDebug('FCM token received: ' + (token ? token.substring(0, 20) + '...' : 'nil'));
        if (!token) return;
        const platform = Capacitor.getPlatform();
        const { error } = await supabase
          .from('profiles')
          .update({
            push_token: token,
            push_platform: platform,
            push_updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        if (error) {
          setPushDebug('STORE FAILED: ' + error.message);
        } else {
          setPushDebug('TOKEN STORED OK: ' + platform);
        }
      });

      await FirebaseMessaging.addListener('notificationReceived', (event) => {
        console.log('[push] notification received:', event.notification?.title);
      });
    }

    // Request permission
    setPushDebug('requesting permission...');
    const perm = await FirebaseMessaging.requestPermissions();
    setPushDebug('permission: ' + perm.receive);

    if (perm.receive !== 'granted') {
      setPushDebug('permission NOT granted');
      return;
    }

    // Get the FCM token directly
    setPushDebug('getting FCM token...');
    const result = await FirebaseMessaging.getToken();
    const token = result.token;

    if (token) {
      setPushDebug('FCM token (direct): ' + token.substring(0, 20) + '...');
      const platform = Capacitor.getPlatform();
      const { error } = await supabase
        .from('profiles')
        .update({
          push_token: token,
          push_platform: platform,
          push_updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (error) {
        setPushDebug('STORE FAILED: ' + error.message);
      } else {
        setPushDebug('TOKEN STORED OK: ' + platform);
      }
    } else {
      setPushDebug('getToken returned nil');
    }

  } catch (err) {
    setPushDebug('SETUP FAILED: ' + String(err));
  }
}
