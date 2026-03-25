export type CheckinTime = {
  label: 'morning' | 'midday' | 'evening' | 'night';
  time: string; // "HH:MM" 24h format
  enabled: boolean;
};

export const DEFAULT_CHECKIN_TIMES: CheckinTime[] = [
  { label: 'morning', time: '07:30', enabled: true },
  { label: 'midday', time: '12:30', enabled: true },
  { label: 'evening', time: '19:00', enabled: true },
  { label: 'night', time: '21:30', enabled: true },
];

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function scheduleNotifications(checkinTimes: CheckinTime[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const enabled = checkinTimes.filter(t => t.enabled);

  enabled.forEach(slot => {
    const [hours, minutes] = slot.time.split(':').map(Number);
    const now = new Date();
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);

    // If the time has already passed today, schedule for tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }

    const delay = target.getTime() - now.getTime();

    setTimeout(() => {
      new Notification('BioCycle', {
        body: 'Bio is waiting for your deposit. Open the app to check in.',
        icon: '/favicon.ico',
        data: { url: 'https://biocycle.app' },
      });
      // Reschedule for the next day
      scheduleNotifications([slot]);
    }, delay);
  });
}
