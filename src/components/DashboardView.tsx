import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  CalendarPlus,
  PlusCircle,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { ScheduleItem, BookingItem, RoomAvailabilityResult } from '../types';
import {
  getCampusTimeInfo,
  formatTimeRangeWita,
  getDayNameInWita,
  formatDateInWita,
} from '../utils/clock';
import {
  extractUniqueRooms,
  checkRoomAvailability,
  timeToMinutes,
  formatIndonesianDate,
  isBookingPast,
} from '../utils/timeConflict';
import { reservationService } from '../services/reservationService';
import { Button } from './Button';
import { TimeInput24 } from './TimeInput24';

interface DashboardViewProps {
  schedules: ScheduleItem[];
  bookings: BookingItem[];
  searchDate: string;
  setSearchDate: (date: string) => void;
  searchStartTime: string;
  setSearchStartTime: (time: string) => void;
  searchEndTime: string;
  setSearchEndTime: (time: string) => void;
  onNavigateToSchedule: () => void;
  onRefreshSchedule: () => void;
  isScheduleLoading: boolean;
  scheduleError: string | null;
  isDbConnected: boolean;
  onOpenBookingModal: (room?: string, date?: string, start?: string, end?: string) => void;
  onRefreshBookings: () => void;
  isBookingsLoading: boolean;
  recentBookingSuccessMessage?: string | null;
  onClearSuccessMessage?: () => void;
}

/**
 * Halaman Terpadu: Cari & Booking Ruangan (SchedU)
 *
 * Menerapkan Anti-AI-Slop Design System:
 * 1. Zero-Pill & Metadata Discipline: Menghilangkan pill boxes membulat tebal pada status ruangan dan label.
 * 2. Whitespace Over Cards-Within-Cards: Tidak menumpuk bordered card di dalam bordered card.
 * 3. Segmented Controls Bersih: Tab filter dan navigasi terintegrasi dengan gaya minimalis.
 * 4. Tabular Numerals: Tabular nums pada seluruh waktu WITA, tanggal, dan hitungan kuantitatif.
 * 5. Palet Netral Teduh: Light mode ergonomis dengan kontras lembut yang nyaman di mata.
 */
export const DashboardView: React.FC<DashboardViewProps> = ({
  schedules,
  bookings,
  searchDate,
  setSearchDate,
  searchStartTime,
  setSearchStartTime,
  searchEndTime,
  setSearchEndTime,
  onNavigateToSchedule,
  isScheduleLoading,
  scheduleError,
  onOpenBookingModal,
  onRefreshBookings,
  isBookingsLoading,
  recentBookingSuccessMessage,
  onClearSuccessMessage,
}) => {
  // 1. Sub-tab aktif: 'finder' (Cari & Pesan) atau 'history' (Riwayat Booking)
  const [activeSubTab, setActiveSubTab] = useState<'finder' | 'history'>('finder');

  // 2. State Jam Kampus Real-Time dalam zona waktu WITA
  const [clockInfo, setClockInfo] = useState(getCampusTimeInfo());
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'in_use'>('all');
  const [roomQuery, setRoomQuery] = useState('');

  // 3. State khusus riwayat booking
  const [bookingFilterTab, setBookingFilterTab] = useState<'all' | 'active' | 'past'>('active');
  const [bookingSearchQuery, setBookingSearchQuery] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Perbarui jam kampus otomatis setiap detik
  useEffect(() => {
    const timer = setInterval(() => {
      setClockInfo(getCampusTimeInfo());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Hitung nama hari dalam bahasa Indonesia (WITA)
  const chosenDayName = useMemo(() => {
    return getDayNameInWita(searchDate);
  }, [searchDate]);

  // 5. Ambil daftar ruangan unik
  const allUniqueRooms = useMemo(() => {
    return extractUniqueRooms(schedules, bookings);
  }, [schedules, bookings]);

  // 6. Validasi waktu 24 jam
  const isValidTime = useMemo(() => {
    if (!searchStartTime || !searchEndTime) return false;
    return timeToMinutes(searchEndTime) > timeToMinutes(searchStartTime);
  }, [searchStartTime, searchEndTime]);

  // 7. Periksa ketersediaan setiap ruangan
  const availabilityResults = useMemo<RoomAvailabilityResult[]>(() => {
    if (!isValidTime || schedules.length === 0 || !searchDate) {
      return [];
    }

    return allUniqueRooms.map(room => {
      return checkRoomAvailability(
        room,
        searchDate,
        searchStartTime,
        searchEndTime,
        schedules,
        bookings
      );
    });
  }, [allUniqueRooms, searchDate, searchStartTime, searchEndTime, schedules, bookings, isValidTime]);

  // 8. Filter hasil pencarian kartu ruangan
  const filteredRooms = useMemo(() => {
    return availabilityResults.filter(item => {
      if (filterMode === 'available' && !item.isAvailable) return false;
      if (filterMode === 'in_use' && item.isAvailable) return false;

      if (roomQuery.trim()) {
        const q = roomQuery.toLowerCase();
        if (!item.roomName.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [availabilityResults, filterMode, roomQuery]);

  const availableCount = availabilityResults.filter(r => r.isAvailable).length;
  const inUseCount = availabilityResults.length - availableCount;

  // Preset jam perkuliahan
  const applyPreset = (start: string, end: string) => {
    setSearchStartTime(start);
    setSearchEndTime(end);
  };

  // 9. Kelola data riwayat booking
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

  const activeBookingCount = useMemo(() => {
    return processedBookings.filter(b => b.computedStatus === 'aktif').length;
  }, [processedBookings]);

  // Filter riwayat booking
  const filteredBookingsList = useMemo(() => {
    return processedBookings.filter(b => {
      if (bookingFilterTab === 'active' && b.computedStatus !== 'aktif') return false;
      if (bookingFilterTab === 'past' && b.computedStatus === 'aktif') return false;

      if (bookingSearchQuery.trim()) {
        const q = bookingSearchQuery.toLowerCase();
        const matchRoom = b.ruangan.toLowerCase().includes(q);
        const matchName = b.nama_peminjam.toLowerCase().includes(q);
        const matchNim = b.nim.toLowerCase().includes(q);
        const matchKeperluan = b.keperluan.toLowerCase().includes(q);
        if (!matchRoom && !matchName && !matchNim && !matchKeperluan) return false;
      }

      return true;
    });
  }, [processedBookings, bookingFilterTab, bookingSearchQuery]);

  // Handler batalkan booking
  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan jadwal peminjaman ruangan ini?')) {
      return;
    }

    setCancellingId(bookingId);
    try {
      const res = await reservationService.cancelBooking(bookingId);
      if (res.success) {
        onRefreshBookings();
      } else {
        alert(res.error || 'Gagal membatalkan booking.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat membatalkan booking.');
    } finally {
      setCancellingId(null);
    }
  };

  // 10. Jadwal perkuliahan hari ini (WITA)
  const todayDayName = clockInfo.dayName;
  const todayLectures = useMemo(() => {
    return schedules
      .filter(s => s.Hari.toLowerCase() === todayDayName.toLowerCase())
      .sort((a, b) => a.Mulai.localeCompare(b.Mulai));
  }, [schedules, todayDayName]);

  return (
    <div className="space-y-5 pb-12">
      {/* Notifikasi Berhasil Booking */}
      {recentBookingSuccessMessage && (
        <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-start justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-medium">{recentBookingSuccessMessage}</span>
          </div>
          {onClearSuccessMessage && (
            <button
              type="button"
              onClick={onClearSuccessMessage}
              className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 text-xs font-semibold cursor-pointer shrink-0"
            >
              Tutup
            </button>
          )}
        </div>
      )}

      {/* 1. Bar Waktu Kampus & Quick Action Booking */}
      <div className="bg-white dark:bg-stone-900 rounded-xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shrink-0">
            <Clock className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Waktu Kampus WITA
            </div>
            <div className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono tabular-nums tracking-tight">
              {clockInfo.formattedFull}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => onOpenBookingModal()}
          >
            + Buat Booking Baru
          </Button>

          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
            {parseInt(clockInfo.timeString24.split(':')[0], 10) >= 7 && parseInt(clockInfo.timeString24.split(':')[0], 10) < 18
              ? 'Jam Aktif Kuliah'
              : 'Luar Jam Kuliah'}
          </span>
        </div>
      </div>

      {/* 2. Sub-Tab Switcher Terpadu (Segmented Control Tanpa Candy Pills) */}
      <div className="bg-white dark:bg-stone-900 rounded-xl p-1.5 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-1 select-none">
        <div className="flex items-center gap-1 w-full sm:w-auto">
          {/* Sub-tab 1: Cari & Pesan Ruangan */}
          <button
            type="button"
            onClick={() => setActiveSubTab('finder')}
            aria-current={activeSubTab === 'finder' ? 'true' : undefined}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[38px] ${
              activeSubTab === 'finder'
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <Search className="w-4 h-4 shrink-0 text-orange-500" />
            <span>Cari & Pesan Ruangan</span>
          </button>

          {/* Sub-tab 2: Riwayat & Kelola Booking */}
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            aria-current={activeSubTab === 'history' ? 'true' : undefined}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors cursor-pointer min-h-[38px] ${
              activeSubTab === 'history'
                ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            <CalendarPlus className="w-4 h-4 shrink-0 text-orange-500" />
            <span>Riwayat & Kelola Booking</span>
            {activeBookingCount > 0 && (
              <span className="font-mono tabular-nums text-xs text-stone-500 dark:text-stone-400 ml-0.5">
                ({activeBookingCount})
              </span>
            )}
          </button>
        </div>

        <div className="hidden md:flex items-center pr-3 text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
          <span>{allUniqueRooms.length} Ruangan Terdaftar</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAMPILAN 1: PENCARIAN RUANGAN & BOOKING LANGSUNG                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'finder' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Form Pencarian Ruangan */}
          <div className="bg-white dark:bg-stone-900 rounded-xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-stone-100 dark:border-stone-800">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
                  <Search className="w-4 h-4 text-orange-500" />
                  <span>Cek Ketersediaan Ruangan</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Tentukan tanggal dan rentang jam untuk menemukan ruangan yang bebas jadwal kuliah.
                </p>
              </div>

              {/* Status Hari & Waktu Terpilih (Unboxed Metadata) */}
              <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Hari <strong>{chosenDayName}</strong></span>
                <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-semibold text-stone-800 dark:text-stone-200">
                  {formatTimeRangeWita(searchStartTime, searchEndTime)}
                </span>
              </div>
            </div>

            {/* Grid Input: Tanggal, Jam Mulai, Jam Selesai */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* 1. Input Tanggal */}
              <div>
                <label
                  htmlFor="search-date"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Tanggal
                </label>
                <input
                  type="date"
                  id="search-date"
                  value={searchDate}
                  onChange={e => setSearchDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-stone-900 dark:text-stone-100 outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all min-h-[40px] cursor-pointer"
                />
                <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                  {formatDateInWita(searchDate)}
                </span>
              </div>

              {/* 2. Input Jam Mulai */}
              <div>
                <label
                  htmlFor="search-start-time"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Jam Mulai
                </label>
                <TimeInput24
                  id="search-start-time"
                  value={searchStartTime}
                  onChange={setSearchStartTime}
                  ariaLabel="Jam Mulai"
                />
                <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                  Awal pemakaian / sesi
                </span>
              </div>

              {/* 3. Input Jam Selesai */}
              <div>
                <label
                  htmlFor="search-end-time"
                  className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5"
                >
                  Jam Selesai
                </label>
                <TimeInput24
                  id="search-end-time"
                  value={searchEndTime}
                  onChange={setSearchEndTime}
                  ariaLabel="Jam Selesai"
                />
                <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                  Akhir pemakaian / sesi
                </span>
              </div>
            </div>

            {/* Presets Jam Perkuliahan (Subtle Text Controls) */}
            <div className="mt-4 pt-3.5 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center gap-2">
              <span className="text-xs text-stone-500 dark:text-stone-400 mr-1 font-medium">
                Preset Sesi:
              </span>
              {[
                { label: '08:00 - 09:40', start: '08:00', end: '09:40' },
                { label: '09:40 - 11:20', start: '09:40', end: '11:20' },
                { label: '13:20 - 15:00', start: '13:20', end: '15:00' },
                { label: '15:00 - 16:40', start: '15:00', end: '16:40' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.start, p.end)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer font-mono tabular-nums"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Validasi Waktu Tidak Valid */}
          {!isValidTime && (
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Jam selesai harus lebih akhir daripada jam mulai agar ketersediaan dapat dihitung.</span>
            </div>
          )}

          {/* Banner Status Loading */}
          {isScheduleLoading && (
            <div className="p-8 text-center bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 text-xs text-stone-500">
              Memuat data jadwal terkini…
            </div>
          )}

          {/* Area Hasil Ruangan */}
          {isValidTime && !isScheduleLoading && (
            <div className="space-y-4">
              {/* Header Hasil & Filter Segmented */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Hasil Ketersediaan Ruangan
                  </h3>
                  <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                    {filteredRooms.length} Ruangan
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Pencarian Nama Ruangan */}
                  <input
                    type="text"
                    placeholder="Cari ruangan..."
                    value={roomQuery}
                    onChange={e => setRoomQuery(e.target.value)}
                    className="bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-800 outline-none focus:border-orange-500 w-36 sm:w-44"
                  />

                  {/* Filter Status (Segmented Controls Tanpa Candy Badges) */}
                  <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setFilterMode('all')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        filterMode === 'all'
                          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      Semua ({availabilityResults.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('available')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        filterMode === 'available'
                          ? 'bg-white dark:bg-stone-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      Kosong ({availableCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterMode('in_use')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                        filterMode === 'in_use'
                          ? 'bg-white dark:bg-stone-700 text-rose-700 dark:text-rose-400 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                      }`}
                    >
                      Terpakai ({inUseCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid Kartu Ruangan (Zero-Pill & Whitespace Over Cards Within Cards) */}
              {filteredRooms.length === 0 ? (
                <div className="bg-white dark:bg-stone-900 rounded-xl p-10 text-center border border-dashed border-stone-300 dark:border-stone-800">
                  <Filter className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <h3 className="font-semibold text-sm text-stone-800 dark:text-stone-200">
                    {availableCount === 0 && filterMode === 'available'
                      ? 'Tidak ada ruangan kosong pada waktu tersebut.'
                      : 'Tidak ada ruangan yang cocok dengan filter.'}
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    Silakan ubah rentang waktu atau pilih filter status lainnya.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRooms.map(item => (
                    <div
                      key={item.roomName}
                      className="rounded-xl p-5 border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 transition-colors flex flex-col justify-between"
                    >
                      <div>
                        {/* Header Kartu: Nama Ruangan & Unboxed Status */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                              {item.roomName}
                            </h3>
                            <span className="text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                              {formatTimeRangeWita(searchStartTime, searchEndTime)}
                            </span>
                          </div>

                          {/* Zero-Pill Semantic Indicator */}
                          {item.isAvailable ? (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Kosong</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                              <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                              <span>Terpakai</span>
                            </div>
                          )}
                        </div>

                        {/* Rincian Status (Whitespace over nested boxed cards) */}
                        {item.isAvailable ? (
                          <div className="py-2.5 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Tersedia untuk digunakan</span>
                            <span className="text-stone-300 dark:text-stone-700 mx-1.5" aria-hidden="true">·</span>
                            <span>Bebas dari jadwal perkuliahan & booking pada rentang waktu ini.</span>
                          </div>
                        ) : (
                          <div className="pt-2.5 space-y-2 border-t border-stone-100 dark:border-stone-800">
                            <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                              Jadwal Berlangsung
                            </span>

                            {item.conflicts.map((c, cIdx) => (
                              <div key={cIdx} className="space-y-1 text-xs">
                                <div className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                                  {c.mataKuliah}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 text-stone-500 dark:text-stone-400">
                                  {c.type === 'peminjaman' ? (
                                    <span>Peminjam: <strong className="text-stone-700 dark:text-stone-300 font-medium">{c.peminjam}</strong></span>
                                  ) : (
                                    <span>Kelas: <strong className="font-mono text-stone-700 dark:text-stone-300 font-medium">{c.kelas || '-'}</strong></span>
                                  )}
                                  <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
                                  <span className="font-mono tabular-nums text-rose-600 dark:text-rose-400 font-medium">{c.waktuFormatted}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Footer Kartu: Tombol Tindakan Langsung */}
                      <div className="pt-3 mt-3 border-t border-stone-100 dark:border-stone-800">
                        {item.isAvailable ? (
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            icon={<CalendarPlus className="w-3.5 h-3.5" />}
                            onClick={() =>
                              onOpenBookingModal(
                                item.roomName,
                                searchDate,
                                searchStartTime,
                                searchEndTime
                              )
                            }
                          >
                            Booking Ruangan Ini
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            fullWidth
                            onClick={() =>
                              onOpenBookingModal(
                                item.roomName,
                                searchDate,
                                searchStartTime,
                                searchEndTime
                              )
                            }
                          >
                            Pilih Jam Lain
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section Jadwal Kuliah Hari Ini */}
          <div className="bg-white dark:bg-stone-900 rounded-xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 transition-colors">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                  Jadwal Kuliah Hari Ini ({todayDayName})
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Ringkasan perkuliahan aktif hari ini di jurusan.
                </p>
              </div>

              <button
                type="button"
                onClick={onNavigateToSchedule}
                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
              >
                <span>Jadwal Lengkap</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayLectures.length === 0 ? (
              <div className="text-center py-6 bg-stone-50 dark:bg-stone-800/40 rounded-lg text-xs text-stone-500">
                Tidak ada perkuliahan yang terjadwal untuk hari {todayDayName}.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayLectures.slice(0, 6).map(item => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border border-stone-200/70 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-800/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono tabular-nums font-semibold text-orange-600 dark:text-orange-400">
                        {formatTimeRangeWita(item.Mulai, item.Selesai)}
                      </span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {item.Ruangan}
                      </span>
                    </div>
                    <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                      {item.Mata_Kuliah}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                      <span>Kelas <strong className="font-mono text-stone-700 dark:text-stone-300">{item.Kelas}</strong></span>
                      <span className="truncate max-w-[130px]">{item.Dosen}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAMPILAN 2: RIWAYAT & KELOLA DAFTAR BOOKING                                */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Header Banner Riwayat Booking */}
          <div className="bg-white dark:bg-stone-900 rounded-xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white tracking-tight flex items-center gap-2">
                  <CalendarPlus className="w-5 h-5 text-orange-500" />
                  <span>Riwayat & Kelola Booking Ruangan</span>
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Daftar permohonan peminjaman ruangan mahasiswa dan statusnya.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onRefreshBookings}
                  isLoading={isBookingsLoading}
                >
                  Segarkan Data
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenBookingModal()}
                  icon={<PlusCircle className="w-4 h-4" />}
                >
                  + Booking Ruangan Baru
                </Button>
              </div>
            </div>

            {/* Status Sistem Penyimpanan */}
            <div className="mt-4 pt-3.5 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Penyimpanan persisten aktif</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab('finder')}
                className="font-semibold text-orange-600 dark:text-orange-400 hover:underline"
              >
                ← Kembali ke Pencarian Ruangan
              </button>
            </div>
          </div>

          {/* Bar Filter & Pencarian Booking */}
          <div className="bg-white dark:bg-stone-900 rounded-xl p-3.5 border border-stone-200/80 dark:border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Filter Segmented: Aktif / Riwayat / Semua */}
            <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setBookingFilterTab('active')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  bookingFilterTab === 'active'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Booking Aktif ({activeBookingCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilterTab('past')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  bookingFilterTab === 'past'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Selesai / Batal ({processedBookings.length - activeBookingCount})
              </button>
              <button
                type="button"
                onClick={() => setBookingFilterTab('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  bookingFilterTab === 'all'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                }`}
              >
                Semua ({processedBookings.length})
              </button>
            </div>

            {/* Pencarian Teks */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Cari peminjam, NIM, ruangan..."
                value={bookingSearchQuery}
                onChange={e => setBookingSearchQuery(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-800 dark:text-stone-200 placeholder-stone-400 focus:bg-white dark:focus:bg-stone-800 outline-none focus:border-orange-500"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Daftar Kartu Peminjaman Ruangan */}
          {filteredBookingsList.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-xl p-10 text-center border border-dashed border-stone-300 dark:border-stone-800">
              <CalendarPlus className="w-8 h-8 text-stone-400 mx-auto mb-2.5" />
              <h3 className="font-semibold text-sm text-stone-800 dark:text-stone-200">
                {bookingFilterTab === 'active'
                  ? 'Belum ada peminjaman ruangan yang sedang aktif.'
                  : 'Tidak ditemukan riwayat peminjaman yang cocok.'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                {bookingFilterTab === 'active'
                  ? 'Cari ruangan kosong atau klik tombol "+ Booking Ruangan Baru" untuk mengajukan peminjaman.'
                  : 'Ubah kata kunci pencarian atau ganti filter status di atas.'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenBookingModal()}
                  icon={<PlusCircle className="w-3.5 h-3.5" />}
                >
                  Buat Booking Baru
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setActiveSubTab('finder')}
                  icon={<Search className="w-3.5 h-3.5" />}
                >
                  Cari Ruangan Kosong
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBookingsList.map(item => {
                const isCancelling = cancellingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-stone-900 rounded-xl p-5 border border-stone-200/80 dark:border-stone-800 flex flex-col justify-between"
                  >
                    <div>
                      {/* Baris Atas: Ruangan & Unboxed Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                            <Building2 className="w-4 h-4 text-orange-500" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {item.ruangan}
                            </h3>
                            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                              {item.jam_mulai} - {item.jam_selesai} WITA
                            </span>
                          </div>
                        </div>

                        {/* Status Unboxed */}
                        {item.computedStatus === 'aktif' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                            <span>Aktif</span>
                          </span>
                        ) : item.computedStatus === 'dibatalkan' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
                            <span>Dibatalkan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" aria-hidden="true" />
                            <span>Selesai</span>
                          </span>
                        )}
                      </div>

                      {/* Detail Peminjam (Hairline Divider Data Rows) */}
                      <div className="space-y-2 py-3 border-y border-stone-100 dark:border-stone-800 text-xs">
                        <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                          <span>Tanggal</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {formatIndonesianDate(item.tanggal)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                          <span>Peminjam</span>
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {item.nama_peminjam}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-stone-600 dark:text-stone-400">
                          <span>NIM</span>
                          <span className="font-mono tabular-nums font-semibold text-stone-900 dark:text-stone-100">
                            {item.nim}
                          </span>
                        </div>

                        <div className="pt-1 text-stone-600 dark:text-stone-400">
                          <span className="block mb-1">Keperluan:</span>
                          <p className="text-stone-800 dark:text-stone-200 leading-relaxed">
                            {item.keperluan}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Bawah */}
                    <div className="pt-3 mt-1 flex items-center justify-between">
                      <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono tabular-nums">
                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                      </span>

                      {item.computedStatus === 'aktif' && (
                        <Button
                          variant="danger"
                          size="sm"
                          isLoading={isCancelling}
                          onClick={() => handleCancelBooking(item.id)}
                        >
                          Batalkan Booking
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
