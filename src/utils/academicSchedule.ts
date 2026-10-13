import { ScheduleItem, LecturerTeachingStatus, ScheduleChangeRequest } from '../types';
import { timeToMinutes, minutesToTime } from './timeConflict';

/**
 * Ekstraksi daftar kelas unik (contoh: A, B, C, PTIK A, dll) dari dataset jadwal
 */
export function extractUniqueClasses(schedules: ScheduleItem[]): string[] {
  const classSet = new Set<string>();
  for (const item of schedules) {
    if (item.Kelas && typeof item.Kelas === 'string') {
      const trimmed = item.Kelas.trim();
      if (trimmed.length > 0) {
        classSet.add(trimmed);
      }
    }
  }
  return Array.from(classSet).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
}

/**
 * Ekstraksi daftar dosen pengampu unik dari dataset jadwal
 */
export function extractUniqueLecturers(schedules: ScheduleItem[]): string[] {
  const lecturerSet = new Set<string>();
  for (const item of schedules) {
    if (item.Dosen && typeof item.Dosen === 'string') {
      const trimmed = item.Dosen.trim();
      if (trimmed.length > 0 && trimmed !== '-') {
        lecturerSet.add(trimmed);
      }
    }
  }
  return Array.from(lecturerSet).sort((a, b) => a.localeCompare(b, 'id'));
}

/**
 * Menghitung analisis ketersediaan dan beban mengajar seluruh dosen
 */
export function getLecturersAnalysis(
  schedules: ScheduleItem[],
  currentDay: string,
  currentTime24: string
): LecturerTeachingStatus[] {
  const lecturers = extractUniqueLecturers(schedules);
  const currentMinutes = timeToMinutes(currentTime24);

  return lecturers.map(dosenName => {
    const lecturerItems = schedules.filter(
      item => item.Dosen && item.Dosen.trim().toLowerCase() === dosenName.toLowerCase()
    );

    // Hitung total jam mengajar (menit ke jam)
    let totalMinutes = 0;
    const activeDaysSet = new Set<string>();

    for (const item of lecturerItems) {
      if (item.Hari) activeDaysSet.add(item.Hari.trim());
      const mStart = timeToMinutes(item.Mulai);
      const mEnd = timeToMinutes(item.Selesai);
      if (mEnd > mStart) {
        totalMinutes += mEnd - mStart;
      }
    }

    const todayItems = lecturerItems
      .filter(item => item.Hari.toLowerCase() === currentDay.toLowerCase())
      .sort((a, b) => a.Mulai.localeCompare(b.Mulai));

    let currentStatus: LecturerTeachingStatus['currentStatus'] = 'no_schedule_today';
    let currentRoom: string | undefined;
    let currentCourse: string | undefined;
    let currentClass: string | undefined;

    let nextSchedule: LecturerTeachingStatus['nextSchedule'] | undefined;

    if (todayItems.length > 0) {
      // Cari apakah sedang mengajar saat ini
      const ongoing = todayItems.find(item => {
        const start = timeToMinutes(item.Mulai);
        const end = timeToMinutes(item.Selesai);
        return currentMinutes >= start && currentMinutes < end;
      });

      if (ongoing) {
        currentStatus = 'teaching_now';
        currentRoom = ongoing.Ruangan;
        currentCourse = ongoing.Mata_Kuliah;
        currentClass = ongoing.Kelas;
      } else {
        // Cari jadwal berikutnya hari ini
        const upcomingToday = todayItems.find(item => {
          const start = timeToMinutes(item.Mulai);
          return start > currentMinutes;
        });

        if (upcomingToday) {
          currentStatus = 'upcoming_today';
          nextSchedule = {
            hari: upcomingToday.Hari,
            mulai: upcomingToday.Mulai,
            selesai: upcomingToday.Selesai,
            ruangan: upcomingToday.Ruangan,
            mataKuliah: upcomingToday.Mata_Kuliah,
          };
        } else {
          // Semua jadwal hari ini sudah selesai
          currentStatus = 'finished_today';
        }
      }
    } else {
      currentStatus = 'no_schedule_today';
    }

    // Jika belum ada nextSchedule hari ini, cari jadwal di hari-hari berikutnya
    if (!nextSchedule && currentStatus !== 'teaching_now') {
      const weekdays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const todayIdx = weekdays.indexOf(currentDay);
      for (let offset = 1; offset < 6; offset++) {
        const nextDayIdx = (todayIdx + offset) % 6;
        const targetDay = weekdays[nextDayIdx];
        const nextItems = lecturerItems
          .filter(item => item.Hari.toLowerCase() === targetDay.toLowerCase())
          .sort((a, b) => a.Mulai.localeCompare(b.Mulai));
        if (nextItems.length > 0) {
          nextSchedule = {
            hari: nextItems[0].Hari,
            mulai: nextItems[0].Mulai,
            selesai: nextItems[0].Selesai,
            ruangan: nextItems[0].Ruangan,
            mataKuliah: nextItems[0].Mata_Kuliah,
          };
          break;
        }
      }
    }

    // Hitung slot waktu luang dosen pada hari ini selama jam kerja akademik (08:00 - 17:00)
    const freeSlotsToday: string[] = [];
    if (todayItems.length === 0) {
      freeSlotsToday.push('08:00 - 17:00 WITA (Tersedia Sepanjang Hari)');
    } else {
      let pointer = timeToMinutes('08:00');
      const campusEnd = timeToMinutes('17:00');

      for (const item of todayItems) {
        const itemStart = timeToMinutes(item.Mulai);
        const itemEnd = timeToMinutes(item.Selesai);

        if (itemStart > pointer + 15 && pointer < campusEnd) {
          const slotEnd = Math.min(itemStart, campusEnd);
          freeSlotsToday.push(`${minutesToTime(pointer)} - ${minutesToTime(slotEnd)} WITA`);
        }
        pointer = Math.max(pointer, itemEnd);
      }

      if (pointer < campusEnd && campusEnd - pointer >= 30) {
        freeSlotsToday.push(`${minutesToTime(pointer)} - ${minutesToTime(campusEnd)} WITA`);
      }
    }

    return {
      dosenName,
      totalClasses: lecturerItems.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      activeDays: Array.from(activeDaysSet),
      currentStatus,
      currentRoom,
      currentCourse,
      currentClass,
      nextSchedule,
      freeSlotsToday,
      scheduleItems: lecturerItems,
    };
  });
}

/**
 * Arsitektur Layanan Perubahan Jadwal Terverifikasi Admin (Future Feature)
 * Menyediakan kerangka kerja untuk pengajuan perubahan jadwal yang menunggu
 * persetujuan Administrator / Koordinator Jurusan sebelum dituliskan ke Google Sheets.
 */
export const scheduleChangeServiceArchitecture = {
  isFeatureActive: false, // Dinonaktifkan sesuai spesifikasi fase saat ini
  futureWorkflowSteps: [
    {
      step: 1,
      title: 'Pengajuan oleh Dosen / Koordinator',
      description: 'Dosen mengajukan usulan pemindahan jam kuliah atau perpindahan ruangan dengan alasan akademik.',
    },
    {
      step: 2,
      title: 'Validasi Konflik Otomatis',
      description: 'Sistem SchedU secara otomatis memverifikasi bentrok ruangan dan jadwal mahasiswa pada slot yang diusulkan.',
    },
    {
      step: 3,
      title: 'Verifikasi & Persetujuan Admin Jurusan',
      description: 'Ketua Jurusan atau Bagian Akademik meninjau permohonan melalui dashboard admin dan memberikan status Approved.',
    },
    {
      step: 4,
      title: 'Sinkronisasi Tulis (Write-back) ke Google Sheets',
      description: 'Setelah disetujui, perubahan jadwal disinkronkan secara aman ke Google Sheets resmi jurusan.',
    },
  ],
  createDraftChangeRequest: (
    item: ScheduleItem,
    proposedNewHari: string,
    proposedNewMulai: string,
    proposedNewSelesai: string,
    proposedNewRuangan: string,
    reason: string
  ): ScheduleChangeRequest => {
    return {
      id: `scr-${Date.now()}`,
      scheduleId: item.id,
      mataKuliah: item.Mata_Kuliah,
      kodeMk: item.Kode_Mata_Kuliah,
      kelas: item.Kelas,
      dosen: item.Dosen,
      oldHari: item.Hari,
      oldMulai: item.Mulai,
      oldSelesai: item.Selesai,
      oldRuangan: item.Ruangan,
      newHari: proposedNewHari,
      newMulai: proposedNewMulai,
      newSelesai: proposedNewSelesai,
      newRuangan: proposedNewRuangan,
      alasan: reason,
      requestedBy: item.Dosen || 'Dosen Pengampu',
      requesterRole: 'dosen',
      status: 'pending_approval',
      createdAt: new Date().toISOString(),
      syncedToSheets: false,
    };
  },
};
