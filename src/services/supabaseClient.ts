import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BookingItem } from '../types';

const STORAGE_KEY_URL = 'schedu_supabase_url';
const STORAGE_KEY_KEY = 'schedu_supabase_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

const DEFAULT_PROJECT_URL = 'https://whnvdgrtefntxyllehkd.supabase.co';
const DEFAULT_PROJECT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndobnZkZ3J0ZWZudHh5bGxlaGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMzUyMjgsImV4cCI6MjEwNzcxMTIyOH0.BpUDk7UUkbdcZ0zts6XYAsNbSpGWShTittSAD_4ihn8';

export function getSupabaseCredentials(): { url: string; key: string } {
  // Check localStorage first (user custom overrides), then env, then project defaults
  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  return {
    url: storedUrl || envUrl || DEFAULT_PROJECT_URL,
    key: storedKey || envKey || DEFAULT_PROJECT_KEY,
  };
}

export function saveSupabaseCredentials(url: string, key: string): void {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
    else localStorage.removeItem(STORAGE_KEY_URL);

    if (key) localStorage.setItem(STORAGE_KEY_KEY, key.trim());
    else localStorage.removeItem(STORAGE_KEY_KEY);
  }
  cachedClient = null;
  cachedUrl = '';
  cachedKey = '';
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedUrl = url;
    cachedKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Error creating Supabase client:', err);
    return null;
  }
}

export async function checkSupabaseConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'URL atau Anon Key Supabase belum diisi.',
    };
  }

  try {
    // Attempt a light select to test connectivity
    const { error } = await client.from('peminjaman_ruangan').select('id').limit(1);
    if (error) {
      if (
        error.code === '42P01' ||
        error.code === 'PGRST205' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('peminjaman_ruangan')
      ) {
        return {
          success: false,
          message:
            'Koneksi Supabase aktif, namun tabel "peminjaman_ruangan" belum dibuat. Buka tab Skrip SQL & jalankan skrip di Supabase SQL Editor.',
        };
      }
      return {
        success: false,
        message: `Koneksi Supabase gagal: ${error.message}`,
      };
    }
    return {
      success: true,
      message: 'Koneksi ke Supabase Database berhasil terhubung!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungkan ke Supabase: ${err.message || 'Error jaringan'}`,
    };
  }
}

export async function fetchRemoteBookings(): Promise<BookingItem[]> {
  const client = getSupabaseClient();
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client
      .from('peminjaman_ruangan')
      .select('*')
      .order('tanggal', { ascending: true })
      .order('jam_mulai', { ascending: true });

    if (error) {
      console.warn('Gagal memuat data peminjaman dari Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      nama_peminjam: row.nama_peminjam,
      nim: row.nim,
      ruangan: row.ruangan,
      tanggal: row.tanggal,
      jam_mulai: row.jam_mulai?.substring(0, 5) || row.jam_mulai,
      jam_selesai: row.jam_selesai?.substring(0, 5) || row.jam_selesai,
      keperluan: row.keperluan,
      status: row.status,
      created_at: row.created_at,
      user_id: row.user_id,
    }));
  } catch (err) {
    console.error('Fetch bookings exception:', err);
    return [];
  }
}

export async function insertBooking(
  bookingData: Omit<BookingItem, 'id' | 'created_at' | 'status'>
): Promise<{ success: boolean; data?: BookingItem; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase Database belum dikonfigurasi. Demi kepastian jadwal bersama, peminjaman tidak dapat diproses tanpa database aktif.',
    };
  }

  // Check if session exists (attach user_id if logged in)
  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData?.session;

  try {
    const { data, error } = await client
      .from('peminjaman_ruangan')
      .insert({
        nama_peminjam: bookingData.nama_peminjam.trim(),
        nim: bookingData.nim.trim(),
        ruangan: bookingData.ruangan.trim(),
        tanggal: bookingData.tanggal,
        jam_mulai: bookingData.jam_mulai,
        jam_selesai: bookingData.jam_selesai,
        keperluan: bookingData.keperluan.trim(),
        status: 'aktif',
        user_id: session?.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      if (
        error.code === '42501' ||
        error.message?.includes('violates row-level security policy')
      ) {
        return {
          success: false,
          error:
            'Kebijakan database mengharuskan Anda untuk login terlebih dahulu sebelum mengajukan peminjaman.',
        };
      }
      // If triggered by our custom check_peminjaman_bentrok trigger
      if (error.message.includes('Bentrok!') || error.message.includes('sudah dipinjam')) {
        return {
          success: false,
          error: `Pencegahan bentrok database: ${error.message}`,
        };
      }
      return {
        success: false,
        error: `Gagal menyimpan peminjaman: ${error.message}`,
      };
    }

    return {
      success: true,
      data: {
        id: data.id,
        nama_peminjam: data.nama_peminjam,
        nim: data.nim,
        ruangan: data.ruangan,
        tanggal: data.tanggal,
        jam_mulai: data.jam_mulai?.substring(0, 5) || data.jam_mulai,
        jam_selesai: data.jam_selesai?.substring(0, 5) || data.jam_selesai,
        keperluan: data.keperluan,
        status: data.status,
        created_at: data.created_at,
        user_id: data.user_id,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Error sistem peminjaman: ${err.message || 'Kesalahan jaringan'}`,
    };
  }
}

export async function cancelBookingRemote(id: string): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Database belum terhubung.' };
  }

  try {
    const { error } = await client
      .from('peminjaman_ruangan')
      .update({ status: 'dibatalkan' })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
