import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

export function setPushDebug(msg: string) {
  (window as any).__pushDebug = msg;
  window.dispatchEvent(new CustomEvent('pushDebugUpdate', { detail: msg }));
}

let listenersAttached = false;

export async function registerPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    if (!listenersAttached) {
      listenersAttached = true;

      // APNs token arrives here on iOS
      PushNotifications.addListener('registration', async (token) => {
        setPushDebug('APNs token: ' + token.value.substring(0, 20) + '...');
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
          setPushDebug('STORE FAILED: ' + error.message);
        } else {
          setPushDebug('TOKEN STORED OK: ' + platform);
        }
      });

      PushNotifications.addListener('registrationError', (err) => {
        setPushDebug('REG ERROR: ' + JSON.stringify(err));
      });

      PushNotifications.addListener('pushNotificationReceived', (n) => {
        console.log('[push] received:', n.title);
      });
    }

    setPushDebug('checking permission...');
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    setPushDebug('permission: ' + perm.receive);

    if (perm.receive !== 'granted') {
      setPushDebug('permission NOT granted');
      return;
    }

    setPushDebug('calling register()...');
    await PushNotifications.register();
    setPushDebug('register() done, awaiting token');

  } catch (err) {
    setPushDebug('SETUP FAILED: ' + String(err));
  }
}
