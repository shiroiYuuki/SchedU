import { ScheduleItem, BookingItem, RoomAvailabilityResult, RoomConflictItem } from '../types';
import { formatTimeRangeWita, getDayNameInWita, formatDateInWita, getCampusTimeInfo } from './clock';

/**
 * Converts a time string "HH:mm" or "H:mm" or "HH.mm" into total minutes from 00:00.
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace('.', ':');
  const parts = clean.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Formats minutes from midnight into "HH:mm".
 */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Returns today's ISO date string YYYY-MM-DD in WITA (Asia/Makassar)
 */
export function getTodayDateString(): string {
  return getCampusTimeInfo().dateStringIso;
}

/**
 * Returns current 24-hour time string HH:mm in WITA (Asia/Makassar)
 */
export function getCurrentTimeString(): string {
  return getCampusTimeInfo().timeString24;
}

/**
 * Checks if a booking has passed its end time in WITA
 */
export function isBookingPast(bookingDate: string, endTime: string): boolean {
  const today = getTodayDateString();
  if (bookingDate < today) return true;
  if (bookingDate > today) return false;
  const currentTime = getCurrentTimeString();
  return timeToMinutes(currentTime) >= timeToMinutes(endTime);
}

/**
 * Checks if two intervals overlap:
 * Overlap condition: startA < endB AND startB < endA
 * Touching intervals (endA === startB or endB === startA) do NOT collide.
 */
export function isOverlapping(
  startAStr: string,
  endAStr: string,
  startBStr: string,
  endBStr: string
): boolean {
  const startA = timeToMinutes(startAStr);
  const endA = timeToMinutes(endAStr);
  const startB = timeToMinutes(startBStr);
  const endB = timeToMinutes(endBStr);

  if (endA <= startA || endB <= startB) {
    return false;
  }

  return startA < endB && startB < endA;
}

export { getDayNameInWita as getIndonesianDayName, formatDateInWita as formatIndonesianDate };

/**
 * Extracts the exact unique list of rooms from the schedule data.
 * CRITICAL RULE: Preserves the exact name verbatim from CSV (case, dots, hyphens, spaces).
 */
export function extractUniqueRooms(schedules: ScheduleItem[], bookings: BookingItem[] = []): string[] {
  const roomSet = new Set<string>();

  for (const item of schedules) {
    if (item.Ruangan && typeof item.Ruangan === 'string') {
      const trimmed = item.Ruangan.trim();
      if (trimmed.length > 0) {
        roomSet.add(trimmed);
      }
    }
  }

  for (const b of bookings) {
    if (b.ruangan && typeof b.ruangan === 'string') {
      const trimmed = b.ruangan.trim();
      if (trimmed.length > 0) {
        roomSet.add(trimmed);
      }
    }
  }

  return Array.from(roomSet).sort((a, b) =>
    a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
  );
}

/**
 * Check room availability for a specific room, date, and time range.
 * Separates Mata_Kuliah, Kelas, Ruangan, and Waktu into dedicated fields.
 */
export function checkRoomAvailability(
  room: string,
  dateStr: string,
  startTime: string,
  endTime: string,
  schedules: ScheduleItem[],
  bookings: BookingItem[] = []
): RoomAvailabilityResult {
  const dayName = getDayNameInWita(dateStr);
  const conflicts: RoomConflictItem[] = [];

  // 1. Check Course Schedules for matching Room and Day
  const matchingLectures = schedules.filter(
    s => s.Ruangan === room && s.Hari.toLowerCase() === dayName.toLowerCase()
  );

  for (const s of matchingLectures) {
    if (isOverlapping(startTime, endTime, s.Mulai, s.Selesai)) {
      conflicts.push({
        type: 'jadwal',
        mataKuliah: s.Mata_Kuliah,
        kelas: s.Kelas,
        ruangan: s.Ruangan,
        jamMulai: s.Mulai,
        jamSelesai: s.Selesai,
        waktuFormatted: formatTimeRangeWita(s.Mulai, s.Selesai),
        dosen: s.Dosen,
        kodeMk: s.Kode_Mata_Kuliah,
        hari: s.Hari,
      });
    }
  }

  // 2. Check Active Bookings on this specific date
  const activeBookings = bookings.filter(b => {
    if (b.ruangan !== room) return false;
    if (b.tanggal !== dateStr) return false;
    if (b.status === 'dibatalkan' || b.status === 'selesai') return false;
    return true;
  });

  for (const b of activeBookings) {
    if (isOverlapping(startTime, endTime, b.jam_mulai, b.jam_selesai)) {
      conflicts.push({
        type: 'peminjaman',
        mataKuliah: b.keperluan || 'Peminjaman Ruangan',
        kelas: `NIM ${b.nim}`,
        ruangan: b.ruangan,
        jamMulai: b.jam_mulai,
        jamSelesai: b.jam_selesai,
        waktuFormatted: formatTimeRangeWita(b.jam_mulai, b.jam_selesai),
        peminjam: b.nama_peminjam,
        nim: b.nim,
        keperluan: b.keperluan,
      });
    }
  }

  return {
    roomName: room,
    isAvailable: conflicts.length === 0,
    conflicts,
  };
}

/**
 * Detects schedule overlaps inside the imported source schedule itself.
 */
export function findScheduleClashesInDataset(schedules: ScheduleItem[]): Array<{
  itemA: ScheduleItem;
  itemB: ScheduleItem;
  reason: string;
}> {
  const clashes: Array<{ itemA: ScheduleItem; itemB: ScheduleItem; reason: string }> = [];

  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];

      if (
        a.Hari.toLowerCase() === b.Hari.toLowerCase() &&
        a.Ruangan === b.Ruangan &&
        isOverlapping(a.Mulai, a.Selesai, b.Mulai, b.Selesai)
      ) {
        clashes.push({
          itemA: a,
          itemB: b,
          reason: `Ruangan ${a.Ruangan} tercatat terpakai ganda pada ${a.Hari} antara "${a.Mata_Kuliah}" (${a.Mulai}–${a.Selesai} WITA) dan "${b.Mata_Kuliah}" (${b.Mulai}–${b.Selesai} WITA)`,
        });
      }
    }
  }

  return clashes;
}
