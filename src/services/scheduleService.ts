import { ScheduleItem } from '../types';
import { parseCSV } from '../utils/csvParser';
import { SCHEDULE_SOURCE_CONFIG } from '../config/dataSource';

export interface FetchResult {
  items: ScheduleItem[];
  error?: string;
  timestamp: string;
}

/**
 * Mengambil dan memproses data jadwal perkuliahan dari Google Sheets (CSV).
 *
 * Fungsi ini bertindak sebagai jembatan (service) antara sumber data Google Sheets
 * dan antarmuka pengguna (UI). Komponen UI tidak perlu tahu cara data diunduh atau diparsing,
 * mereka cukup memanggil `fetchSchedule()`.
 *
 * @param ignoreCache Jika true, sistem mengabaikan cache lokal dan langsung mengambil data terbaru dari Google Sheets.
 * @returns Daftar jadwal kuliah, timestamp pembaruan, dan pesan error jika gagal.
 */
export async function fetchSchedule(ignoreCache = false): Promise<FetchResult> {
  const { csvUrl, storageCacheKey, storageLastUpdatedKey, requestTimeoutMs } =
    SCHEDULE_SOURCE_CONFIG;

  // 1. Periksa cache lokal di browser jika tidak dipaksa refresh.
  // Ini membuat halaman terbuka secara instan bagi mahasiswa tanpa menunggu loading jaringan.
  if (!ignoreCache && typeof window !== 'undefined') {
    const cachedData = localStorage.getItem(storageCacheKey);
    const cachedTime = localStorage.getItem(storageLastUpdatedKey);

    if (cachedData && cachedTime) {
      try {
        const parsed = JSON.parse(cachedData) as ScheduleItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            items: parsed,
            timestamp: cachedTime,
          };
        }
      } catch (err) {
        // Jika data cache rusak, lanjutkan mengambil dari internet
      }
    }
  }

  // 2. Ambil data CSV dari URL Google Sheets menggunakan Fetch API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/csv, text/plain, */*',
      },
      cache: ignoreCache ? 'no-cache' : 'default',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Periksa status respon server Google
    if (!response.ok) {
      throw new Error(
        `Server Google Sheets merespons status ${response.status} (${response.statusText})`
      );
    }

    const rawCSV = await response.text();

    // Verifikasi bahwa respon benar-benar teks CSV, bukan halaman login HTML
    if (rawCSV.trim().startsWith('<!DOCTYPE html') || rawCSV.trim().startsWith('<html')) {
      throw new Error(
        'Tautan mengembalikan dokumen HTML, bukan data CSV. Pastikan Spreadsheet dipublikasikan via File > Bagikan > Publikasikan ke web > format .csv.'
      );
    }

    // 3. Parsing data mentah CSV menjadi array objek ScheduleItem
    const items = parseCSV(rawCSV);

    if (items.length === 0) {
      throw new Error(
        'Data CSV Google Sheets berhasil diunduh namun tidak memuat baris jadwal perkuliahan yang valid.'
      );
    }

    // 4. Format waktu pembaruan terakhir dalam zona waktu WITA (Asia/Makassar) dengan format 24 jam HH:mm
    const now = new Date();
    const dateFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      hour12: false,
    });
    const timeParts = timeFormatter.formatToParts(now);
    const hh = (timeParts.find(p => p.type === 'hour')?.value || '00').padStart(2, '0');
    const mm = (timeParts.find(p => p.type === 'minute')?.value || '00').padStart(2, '0');
    const nowStr = `${dateFormatter.format(now)}, ${hh}:${mm} WITA`;

    // 5. Simpan ke cache lokal browser untuk percepatan kunjungan berikutnya
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageCacheKey, JSON.stringify(items));
        localStorage.setItem(storageLastUpdatedKey, nowStr);
      } catch (storageError) {
        // Tangani jika kuota localStorage penuh
      }
    }

    return {
      items,
      timestamp: nowStr,
    };
  } catch (err: any) {
    const isAbort = err.name === 'AbortError';
    const isCors =
      err.name === 'TypeError' &&
      (err.message.includes('Failed to fetch') ||
        err.message.includes('NetworkError') ||
        err.message.includes('CORS'));

    let errorDetail = err.message || 'Gagal mengambil data jadwal dari Google Sheets.';
    if (isAbort) {
      errorDetail = 'Waktu permintaan habis (timeout). Koneksi internet lambat atau bermasalah.';
    } else if (isCors) {
      errorDetail =
        'Gagal mengambil data akibat batasan browser (CORS). Periksa koneksi internet atau status publikasi Google Sheets.';
    }

    const errNow = new Date();
    const errDateFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const errTimeFormatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      hour12: false,
    });
    const errParts = errTimeFormatter.formatToParts(errNow);
    const errHh = (errParts.find(p => p.type === 'hour')?.value || '00').padStart(2, '0');
    const errMm = (errParts.find(p => p.type === 'minute')?.value || '00').padStart(2, '0');
    const errNowStr = `${errDateFormatter.format(errNow)}, ${errHh}:${errMm} WITA`;

    // Sesuai aturan: jika gagal, berikan error jujur dan JANGAN membuat data tiruan/palsu
    return {
      items: [],
      error: errorDetail,
      timestamp: errNowStr,
    };
  }
}
