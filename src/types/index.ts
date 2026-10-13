export interface ScheduleItem {
  id: string;
  Hari: string; // Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu
  Kelas: string;
  Kode_Mata_Kuliah: string;
  Mata_Kuliah: string;
  Mulai: string; // HH:mm format, e.g. "08:00"
  Selesai: string; // HH:mm format, e.g. "10:30"
  Ruangan: string;
  Dosen: string;
}

export interface BookingItem {
  id: string;
  nama_peminjam: string;
  nim: string;
  ruangan: string;
  tanggal: string; // YYYY-MM-DD
  jam_mulai: string; // HH:mm
  jam_selesai: string; // HH:mm
  keperluan: string;
  created_at: string;
  status: 'aktif' | 'selesai' | 'dibatalkan';
  user_id?: string;
}

export interface RoomConflictItem {
  type: 'jadwal' | 'peminjaman';
  mataKuliah: string;
  kelas?: string;
  ruangan: string;
  jamMulai: string;
  jamSelesai: string;
  waktuFormatted: string; // e.g. "13:30–16:00 WITA"
  dosen?: string;
  kodeMk?: string;
  hari?: string;
  peminjam?: string;
  nim?: string;
  keperluan?: string;
}

export interface RoomAvailabilityResult {
  roomName: string;
  isAvailable: boolean;
  conflicts: RoomConflictItem[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  statusMessage?: string;
}

export interface ScheduleFetchState {
  data: ScheduleItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  sourceUrl: string;
}

/**
 * Arsitektur Usulan Perubahan Jadwal Terverifikasi Admin (Fitur Masa Depan)
 * Mempersiapkan skema tata kelola data perkuliahan sebelum sinkronisasi tulis (write-back) ke Google Sheets.
 */
export interface ScheduleChangeRequest {
  id: string;
  scheduleId: string;
  mataKuliah: string;
  kodeMk: string;
  kelas: string;
  dosen: string;
  oldHari: string;
  oldMulai: string;
  oldSelesai: string;
  oldRuangan: string;
  newHari: string;
  newMulai: string;
  newSelesai: string;
  newRuangan: string;
  alasan: string;
  requestedBy: string;
  requesterRole: 'dosen' | 'koordinator' | 'admin';
  status: 'pending_approval' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
  syncedToSheets: boolean;
}

/**
 * Representasi Analisis Ketersediaan & Beban Mengajar Dosen
 */
export interface LecturerTeachingStatus {
  dosenName: string;
  totalClasses: number;
  totalHours: number; // Dalam jam desimal
  activeDays: string[];
  currentStatus: 'teaching_now' | 'finished_today' | 'upcoming_today' | 'no_schedule_today';
  currentRoom?: string;
  currentCourse?: string;
  currentClass?: string;
  nextSchedule?: {
    hari: string;
    mulai: string;
    selesai: string;
    ruangan: string;
    mataKuliah: string;
  };
  freeSlotsToday: string[];
  scheduleItems: ScheduleItem[];
}
