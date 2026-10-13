import { BookingItem } from '../types';
import {
  checkSupabaseConnection,
  fetchRemoteBookings,
  insertBooking,
  cancelBookingRemote,
  getSupabaseCredentials,
} from './supabaseClient';
import { isOverlapping } from '../utils/timeConflict';

const LOCAL_STORAGE_BOOKINGS_KEY = 'schedu_local_bookings';

/**
 * Helper untuk membaca data peminjaman lokal (fallback offline/klien jika Supabase belum disetup)
 */
function getLocalBookings(): BookingItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error membaca peminjaman lokal:', err);
    return [];
  }
}

/**
 * Helper untuk menyimpan data peminjaman lokal
 */
function saveLocalBookings(items: BookingItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_BOOKINGS_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Error menyimpan peminjaman lokal:', err);
  }
}

/**
 * Service untuk mengelola Operasi Peminjaman Ruangan (Reservation Service)
 *
 * Mengabstraksi koneksi database Supabase dari komponen antarmuka (UI).
 * Menyediakan seamless offline/local storage fallback ketika Supabase belum dikonfigurasi,
 * dan menggunakan Supabase Cloud PostgreSQL ketika kredensial tersedia.
 */
export const reservationService = {
  /**
   * Memeriksa apakah database Supabase aktif dan dapat diakses.
   */
  async checkConnection(): Promise<{ success: boolean; message: string; isRemote: boolean }> {
    const creds = getSupabaseCredentials();
    if (!creds.url || !creds.key) {
      return {
        success: true,
        message: 'Mode Penyimpanan Lokal Aktif (Database Supabase dapat dihubungkan di Pengaturan).',
        isRemote: false,
      };
    }

    const res = await checkSupabaseConnection();
    return {
      success: res.success,
      message: res.message,
      isRemote: res.success,
    };
  },

  /**
   * Mengambil seluruh daftar peminjaman ruangan yang tercatat.
   */
  async getBookings(): Promise<BookingItem[]> {
    const creds = getSupabaseCredentials();
    if (creds.url && creds.key) {
      const remote = await fetchRemoteBookings();
      if (remote.length > 0) {
        return remote;
      }
    }
    // Jika tidak ada Supabase atau kosong, gunakan peminjaman lokal
    return getLocalBookings();
  },

  /**
   * Mengajukan peminjaman ruangan baru dengan validasi bentrok.
   */
  async createBooking(
    bookingData: Omit<BookingItem, 'id' | 'created_at' | 'status'>
  ): Promise<{ success: boolean; data?: BookingItem; error?: string }> {
    const creds = getSupabaseCredentials();

    // 1. Jika Supabase dikonfigurasi, gunakan Supabase
    if (creds.url && creds.key) {
      const remoteRes = await insertBooking(bookingData);
      if (remoteRes.success && remoteRes.data) {
        // Simpan juga salinan lokal sebagai cache
        const local = getLocalBookings();
        saveLocalBookings([remoteRes.data, ...local.filter(b => b.id !== remoteRes.data!.id)]);
        return remoteRes;
      }
      // Jika remote gagal karena validasi bentrok, teruskan error
      if (remoteRes.error && remoteRes.error.includes('Bentrok')) {
        return remoteRes;
      }
    }

    // 2. Fallback penyimpanan lokal: Lakukan validasi bentrok di sisi service
    const existingBookings = getLocalBookings();
    const clash = existingBookings.find(b => {
      if (b.status === 'dibatalkan' || b.status === 'selesai') return false;
      if (b.ruangan.toLowerCase() !== bookingData.ruangan.toLowerCase()) return false;
      if (b.tanggal !== bookingData.tanggal) return false;
      return isOverlapping(bookingData.jam_mulai, bookingData.jam_selesai, b.jam_mulai, b.jam_selesai);
    });

    if (clash) {
      return {
        success: false,
        error: `Bentrok! Ruangan ${bookingData.ruangan} pada jam ${bookingData.jam_mulai}–${bookingData.jam_selesai} sudah dipinjam oleh ${clash.nama_peminjam} (${clash.jam_mulai}–${clash.jam_selesai} WITA).`,
      };
    }

    const newBooking: BookingItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nama_peminjam: bookingData.nama_peminjam.trim(),
      nim: bookingData.nim.trim(),
      ruangan: bookingData.ruangan.trim(),
      tanggal: bookingData.tanggal,
      jam_mulai: bookingData.jam_mulai,
      jam_selesai: bookingData.jam_selesai,
      keperluan: bookingData.keperluan.trim(),
      status: 'aktif',
      created_at: new Date().toISOString(),
      user_id: 'local-user',
    };

    saveLocalBookings([newBooking, ...existingBookings]);

    return {
      success: true,
      data: newBooking,
    };
  },

  /**
   * Membatalkan peminjaman ruangan yang sudah diajukan.
   */
  async cancelBooking(id: string): Promise<{ success: boolean; error?: string }> {
    const creds = getSupabaseCredentials();
    if (creds.url && creds.key) {
      const res = await cancelBookingRemote(id);
      if (res.success) {
        const local = getLocalBookings().map(b => (b.id === id ? { ...b, status: 'dibatalkan' as const } : b));
        saveLocalBookings(local);
        return res;
      }
    }

    // Update lokal
    const local = getLocalBookings().map(b => (b.id === id ? { ...b, status: 'dibatalkan' as const } : b));
    saveLocalBookings(local);
    return { success: true };
  },
};
