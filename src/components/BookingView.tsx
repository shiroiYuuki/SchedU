import React, { useState, useMemo } from 'react';
import {
  CalendarPlus,
  Clock,
  PlusCircle,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  Database,
  ShieldCheck,
  XCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { BookingItem, ScheduleItem } from '../types';
import { formatIndonesianDate, isBookingPast } from '../utils/timeConflict';
import { reservationService } from '../services/reservationService';
import { Button } from './Button';

interface BookingViewProps {
  bookings: BookingItem[];
  schedules: ScheduleItem[];
  onOpenBookingModal: (room?: string) => void;
  onRefreshBookings: () => void;
  isRefreshing: boolean;
  isDbConnected: boolean;
  onNavigateToFinder: () => void;
}

export const BookingView: React.FC<BookingViewProps> = ({
  bookings,
  schedules,
  onOpenBookingModal,
  onRefreshBookings,
  isRefreshing,
  isDbConnected,
  onNavigateToFinder,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'past'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Hitung status booking (aktif vs selesai vs dibatalkan)
  const processedBookings = useMemo(() => {
    return bookings.map(b => {
      const isPast = isBookingPast(b.tanggal, b.jam_selesai);
      const computedStatus =
        b.status === 'dibatalkan' ? 'dibatalkan' : isPast ? 'selesai' : 'aktif';
      return {
        ...b,
        computedStatus,
      };
    });
  }, [bookings]);

  // Filter daftar berdasarkan tab dan query pencarian
  const filteredList = useMemo(() => {
    return processedBookings.filter(b => {
      if (filterTab === 'active' && b.computedStatus !== 'aktif') return false;
      if (filterTab === 'past' && b.computedStatus === 'aktif') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          b.nama_peminjam.toLowerCase().includes(q) ||
          b.nim.toLowerCase().includes(q) ||
          b.ruangan.toLowerCase().includes(q) ||
          b.keperluan.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [processedBookings, filterTab, searchQuery]);

  const activeCount = processedBookings.filter(b => b.computedStatus === 'aktif').length;
  const pastCount = processedBookings.filter(b => b.computedStatus !== 'aktif').length;

  const handleCancel = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan peminjaman ruangan ini?')) {
      return;
    }
    setCancellingId(id);
    const res = await reservationService.cancelBooking(id);
    setCancellingId(null);
    if (res.success) {
      onRefreshBookings();
    } else {
      alert(`Gagal membatalkan peminjaman: ${res.error}`);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner Halaman Booking */}
      <div className="bg-white dark:bg-stone-900 rounded-2xl p-5 sm:p-7 border border-stone-200 dark:border-stone-800 shadow-xs transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-2.5 bg-orange-500 text-white rounded-xl shadow-xs">
                <CalendarPlus className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-white tracking-tight">
                  Booking Ruangan Kosong
                </h1>
                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-0.5">
                  Ajukan peminjaman ruangan untuk kegiatan himpunan, seminar, atau rapat mahasiswa.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefreshBookings}
              isLoading={isRefreshing}
              icon={
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`}
                />
              }
            >
              Segarkan
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onOpenBookingModal()}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Ajukan Booking Ruangan
            </Button>
          </div>
        </div>

        {/* Info Sinkronisasi & Alur */}
        <div className="mt-5 p-3.5 bg-orange-50/60 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-700 dark:text-stone-300">
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-stone-900 dark:text-stone-100">
                Pencegahan Bentrok Otomatis:
              </span>{' '}
              Setiap pengajuan booking divalidasi langsung terhadap jadwal kuliah resmi jurusan dan
              booking aktif lainnya agar tidak ada ruangan yang terpakai ganda.
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToFinder}
            className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline shrink-0 cursor-pointer"
          >
            Cari Ruangan Kosong Dahulu →
          </button>
        </div>
      </div>

      {/* 2. Filter Tabs & Pencarian */}
      <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-colors">
        {/* Tabs Filter */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'active'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Booking Aktif ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('past')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'past'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Riwayat Selesai ({pastCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-orange-500 text-white shadow-2xs'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
            }`}
          >
            Semua ({processedBookings.length})
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari peminjam, NIM, ruangan..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-orange-500 font-medium text-stone-900 dark:text-white w-full sm:w-60"
          />
        </div>
      </div>

      {/* 3. Daftar Kartu Booking Ruangan */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-10 text-center border border-dashed border-stone-300 dark:border-stone-700 transition-colors">
          <Clock className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
            {filterTab === 'active' ? 'Belum Ada Booking Aktif' : 'Tidak Ada Data Booking'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            {filterTab === 'active'
              ? 'Seluruh ruangan saat ini bebas digunakan sesuai jadwal kuliah yang tertera.'
              : 'Tidak ditemukan riwayat peminjaman yang cocok dengan pencarian Anda.'}
          </p>
          <button
            type="button"
            onClick={() => onOpenBookingModal()}
            className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Ajukan Peminjaman Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map(item => (
            <div
              key={item.id}
              className={`bg-white dark:bg-stone-900 rounded-2xl p-5 border transition-all shadow-xs flex flex-col justify-between ${
                item.computedStatus === 'aktif'
                  ? 'border-orange-200/90 dark:border-orange-900/50 hover:border-orange-400 dark:hover:border-orange-600'
                  : 'border-stone-200 dark:border-stone-800 opacity-80'
              }`}
            >
              <div>
                {/* Header Status */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-stone-900 dark:text-stone-100 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>{item.ruangan}</span>
                    </h3>
                    <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {formatIndonesianDate(item.tanggal)}
                    </span>
                  </div>

                  {item.computedStatus === 'aktif' && (
                    <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold rounded-full flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800/60">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Aktif</span>
                    </span>
                  )}
                  {item.computedStatus === 'selesai' && (
                    <span className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-[11px] font-semibold rounded-full border border-stone-200 dark:border-stone-700">
                      Selesai
                    </span>
                  )}
                  {item.computedStatus === 'dibatalkan' && (
                    <span className="px-2.5 py-1 bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[11px] font-semibold rounded-full border border-rose-200 dark:border-rose-900/50">
                      Dibatalkan
                    </span>
                  )}
                </div>

                {/* Badge Waktu 24 Jam */}
                <div className="inline-block px-2.5 py-1 bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/60 rounded-lg text-xs font-mono font-bold text-orange-800 dark:text-orange-300 mb-3">
                  {item.jam_mulai}–{item.jam_selesai} WITA
                </div>

                {/* Keperluan */}
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                    Keperluan:
                  </span>
                  <p className="text-xs text-stone-800 dark:text-stone-200 font-medium bg-stone-50 dark:bg-stone-800/70 p-2.5 rounded-lg border border-stone-200/70 dark:border-stone-700/60 mt-1">
                    {item.keperluan}
                  </p>
                </div>
              </div>

              {/* Footer Kartu: Nama Peminjam & Batalkan */}
              <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-400">
                <div className="truncate">
                  <div className="font-bold text-stone-900 dark:text-stone-100 truncate">
                    {item.nama_peminjam}
                  </div>
                  <div className="text-[11px] font-mono text-stone-500 dark:text-stone-400">
                    NIM: {item.nim}
                  </div>
                </div>

                {item.computedStatus === 'aktif' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleCancel(item.id)}
                    isLoading={cancellingId === item.id}
                    className="shrink-0 ml-2"
                  >
                    Batalkan
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
