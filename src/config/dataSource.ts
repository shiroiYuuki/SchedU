/**
 * ==============================================================================
 * KONFIGURASI SUMBER DATA SCHEDU (Data Source Configuration)
 * ==============================================================================
 *
 * File ini adalah satu-satunya tempat untuk mengatur dari mana SchedU
 * mengambil data jadwal kuliah dan ke mana data peminjaman disimpan.
 *
 * Mengapa file ini dipisahkan?
 * Agar pengelola website dapat mengganti tautan Google Sheets atau penyedia database
 * di masa depan TANPA harus mengedit file tampilan (UI) satu per satu.
 *
 * CATATAN KEAMANAN:
 * - URL Google Sheets di bawah ini adalah URL publik (read-only) untuk dibaca aplikasi.
 * - Jangan pernah menaruh password database atau Supabase Service Role Key di sini.
 */

export const SCHEDULE_SOURCE_CONFIG = {
  // Tipe sumber data: saat ini menggunakan file CSV Google Sheets publik
  type: 'google_sheets_csv',

  // URL resmi CSV Google Sheets jadwal perkuliahan jurusan (WITA)
  // GID 1225346579 mengarah ke sheet jadwal aktif
  csvUrl:
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTbOG2MBBZqQbadcQgIPYmxYtTFfvrD2OHXq2Rz_fUyXa6GOgTiYWNJ1TSwUkcw3WldRbo4B7RsZlNF/pub?gid=1225346579&single=true&output=csv',

  // Kunci penyimpanan sementara (cache) di browser untuk mempercepat pemuatan halaman
  storageCacheKey: 'schedu_cached_schedule_data',
  storageLastUpdatedKey: 'schedu_last_updated_time',

  // Waktu tunggu batas koneksi (timeout) dalam milidetik jika jaringan lambat
  requestTimeoutMs: 12000,
} as const;

// Alias untuk kemudahan akses langsung ke URL CSV
export const GOOGLE_SHEETS_CSV_URL = SCHEDULE_SOURCE_CONFIG.csvUrl;

/**
 * Konfigurasi Database Supabase untuk Tahap Peminjaman Ruangan
 *
 * PENTING:
 * Hanya gunakan ANON KEY (kunci publik) di sini bersama Row Level Security (RLS).
 * Jangan pernah memasukkan SERVICE ROLE SECRET KEY di frontend!
 */
export const DATABASE_CONFIG = {
  // Ambil dari environment variable jika ada, atau gunakan nilai konfigurasi lokal
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',

  // Nama tabel peminjaman di Supabase
  tableName: 'peminjaman_ruangan',
} as const;
