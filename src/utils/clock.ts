/**
 * Real-time clock and timezone utilities for schedU
 * Strictly uses WITA (UTC+08:00 / Asia/Makassar).
 */

export const WITA_TIMEZONE = 'Asia/Makassar';
export const WITA_SUFFIX = 'WITA';

export interface CampusTimeInfo {
  formattedFull: string; // e.g. "Minggu, 11 Oktober 2026 | 18:20 WITA"
  dayName: string; // e.g. "Minggu"
  dateFormatted: string; // e.g. "11 Oktober 2026"
  timeFormatted: string; // e.g. "18:20"
  dateStringIso: string; // "YYYY-MM-DD"
  timeString24: string; // "HH:mm"
  tzSuffix: 'WITA';
}

/**
 * Returns real-time campus date and time formatted in Indonesian locale using Asia/Makassar (WITA)
 */
export function getCampusTimeInfo(now: Date = new Date()): CampusTimeInfo {
  // Format components using Intl.DateTimeFormat in Indonesian locale locked to Asia/Makassar with 24-hour cycle
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const dayName = partMap.weekday || 'Senin';
  const day = partMap.day || '1';
  const month = partMap.month || 'Januari';
  const year = partMap.year || '2026';
  const hour = (partMap.hour || '00').padStart(2, '0');
  const minute = (partMap.minute || '00').padStart(2, '0');

  // Strict 24-hour format HH:mm e.g. "18:20"
  const timeFormatted = `${hour}:${minute}`;
  const timeString24 = `${hour}:${minute}`;
  const dateFormatted = `${day} ${month} ${year}`;
  const formattedFull = `${dayName}, ${day} ${month} ${year} | ${timeFormatted} WITA`;

  // ISO date "YYYY-MM-DD" for HTML input[type=date] in Asia/Makassar
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: WITA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStringIso = isoFormatter.format(now);

  return {
    formattedFull,
    dayName,
    dateFormatted,
    timeFormatted,
    dateStringIso,
    timeString24,
    tzSuffix: 'WITA',
  };
}

/**
 * Formats a time string like "08:00" or "8.00" into "08:00 WITA" (strict 24-hour HH:mm)
 */
export function formatTimeWithWita(timeStr: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim().replace('.', ':');
  return `${clean} WITA`;
}

/**
 * Formats an interval like "08:00" and "09:40" into "08:00–09:40 WITA" (strict 24-hour HH:mm)
 */
export function formatTimeRangeWita(start: string, end: string): string {
  if (!start || !end) return '';
  const s = start.trim().replace('.', ':');
  const e = end.trim().replace('.', ':');
  return `${s}–${e} WITA`;
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Calculates the exact Indonesian day name for a YYYY-MM-DD string in Asia/Makassar
 */
export function getDayNameInWita(dateStr: string): string {
  if (!dateStr) return 'Senin';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 'Senin';
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || !month || !day) return 'Senin';

  // Noon UTC avoids midnight edge shifts in Asia/Makassar
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
  });
  return formatter.format(d);
}

/**
 * Formats YYYY-MM-DD into Indonesian date string like "Kamis, 15 Oktober 2026"
 */
export function formatDateInWita(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!year || !month || !day) return dateStr;

  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return formatter.format(d);
}
