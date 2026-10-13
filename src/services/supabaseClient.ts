import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BookingItem } from '../types';

const STORAGE_KEY_URL = 'schedu_supabase_url';
const STORAGE_KEY_KEY = 'schedu_supabase_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseCredentials(): { url: string; key: string } {
  // Check env first, then localStorage
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: storedUrl || envUrl,
    key: storedKey || envKey,
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
      if (error.code === '42P01') {
        return {
          success: false,
          message: 'Tabel "peminjaman_ruangan" belum dibuat di Supabase. Silakan jalankan skrip SQL di Supabase SQL Editor.',
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

  // Check if session exists (RLS requires authenticated user for insert)
  const { data: sessionData } = await client.auth.getSession();
  const session = sessionData?.session;

  if (!session) {
    return {
      success: false,
      error: 'Anda harus login terlebih dahulu sebelum mengajukan peminjaman ruangan.',
    };
  }

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
        user_id: session.user.id,
      })
      .select()
      .single();

    if (error) {
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
