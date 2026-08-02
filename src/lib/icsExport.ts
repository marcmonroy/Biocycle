import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface IcsEvent {
  date: Date;
  title: string;
  notes?: string;
}

function escapeIcs(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function buildIcs(events: IcsEvent[]): string {
  const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
  const vevents = events.map((ev, i) => {
    const start = fmtDate(ev.date);
    const next = new Date(ev.date);
    next.setDate(next.getDate() + 1);
    const end = fmtDate(next);
    const uid = `biocycle-${start}-${i}-${Math.random().toString(36).slice(2)}@biocycle.app`;
    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcs(ev.title)}`,
    ];
    if (ev.notes) lines.push(`DESCRIPTION:${escapeIcs(ev.notes)}`);
    lines.push('END:VEVENT');
    return lines.join('\r\n');
  }).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BioCycle//BioCycle App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');
}

export async function exportToCalendar(
  events: IcsEvent[],
  filename: string,
): Promise<void> {
  if (events.length === 0) return;
  const icsContent = buildIcs(events);

  try {
    // ── Native path: write to Cache, then Share ──────────────────────────
    if (Capacitor.isNativePlatform()) {
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: icsContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: filename,
        url: writeResult.uri,
        dialogTitle: filename,
      });
      return;
    }

    // ── Web: try navigator.share with File ───────────────────────────────
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const file = new File([blob], filename, { type: 'text/calendar' });
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file] });
      return;
    }

    // ── Web fallback: anchor download ────────────────────────────────────
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('[icsExport] export failed', e);
    // Last-resort: open blob URL in new tab
    if (!Capacitor.isNativePlatform()) {
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  }
}
