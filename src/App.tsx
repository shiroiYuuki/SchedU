import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ScheduleView } from './components/ScheduleView';
import { BookingModal } from './components/BookingModal';
import { ScheduleItem, BookingItem } from './types';
import { fetchSchedule } from './services/scheduleService';
import { reservationService } from './services/reservationService';
import { getCampusTimeInfo } from './utils/clock';
import { useTheme } from './hooks/useTheme';
import { Button } from './components/Button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Komponen Induk Aplikasi SchedU (App.tsx)
 *
 * Mengelola alur utama website:
 * 1. Tema Tampilan (Dark Mode, Light Mode redup & nyaman, dan Otomatis Sistem).
 * 2. Navigasi Terpadu:
 *    - 'Cari & Booking Ruangan' (dashboard)
 *    - 'Jadwal Kuliah' (schedule)
 * 3. Pemuatan otomatis jadwal perkuliahan dari Google Sheets CSV resmi jurusan.
 * 4. Pemuatan dan sinkronisasi data peminjaman ruangan dengan pencegahan bentrok.
 * 5. Modal formulir booking ruangan terintegrasi langsung dengan hasil pencarian.
 */
export default function App() {
  // 1. Hook Pengelola Tema (Dark Mode / Light Mode / Sistem)
  const { theme, setTheme, isDark } = useTheme();

  // 2. State Navigasi Tab ('dashboard' | 'schedule')
  const [activeTab, setActiveTab] = useState<NavTabType>('dashboard');
  // State drawer mobile (buka/tutup menu navigasi pada layar HP)
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  // 3. State Data Jadwal Perkuliahan
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState<boolean>(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // 4. State Data Peminjaman Ruangan (Integrasi Service)
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [isBookingsLoading, setIsBookingsLoading] = useState<boolean>(false);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // 5. State Modal Booking Ruangan
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [modalInitialRoom, setModalInitialRoom] = useState<string>('');
  const [modalInitialDate, setModalInitialDate] = useState<string>('');
  const [modalInitialStartTime, setModalInitialStartTime] = useState<string>('08:00');
  const [modalInitialEndTime, setModalInitialEndTime] = useState<string>('09:40');

  // 6. Parameter Pencarian Ketersediaan Ruangan (Default Waktu WITA)
  const initialClock = getCampusTimeInfo();
  const [searchDate, setSearchDate] = useState<string>(initialClock.dateStringIso);
  const [searchStartTime, setSearchStartTime] = useState<string>('08:00');
  const [searchEndTime, setSearchEndTime] = useState<string>('09:40');

  /**
   * Fungsi untuk mengambil data jadwal dari Google Sheets via scheduleService.
   */
  const loadSchedule = useCallback(async (forceRefresh = false) => {
    setIsScheduleLoading(true);
    setScheduleError(null);

    try {
      const res = await fetchSchedule(forceRefresh);
      setSchedules(res.items);
      setLastUpdated(res.timestamp);

      if (res.error) {
        setScheduleError(res.error);
      }
    } catch (err: any) {
      setScheduleError(
        err.message || 'Jadwal belum berhasil dimuat. Periksa koneksi internet lalu coba lagi.'
      );
    } finally {
      setIsScheduleLoading(false);
    }
  }, []);

  /**
   * Fungsi untuk memuat data peminjaman ruangan via reservationService.
   */
  const loadBookings = useCallback(async () => {
    setIsBookingsLoading(true);
    try {
      const conn = await reservationService.checkConnection();
      setIsDbConnected(conn.success);
      const items = await reservationService.getBookings();
      setBookings(items);
    } catch (err) {
      console.error('Error memuat data booking:', err);
    } finally {
      setIsBookingsLoading(false);
    }
  }, []);

  // Ambil jadwal kuliah dan data booking saat website pertama kali dibuka
  useEffect(() => {
    loadSchedule(false);
    loadBookings();

    // Atur rentang jam awal yang paling relevan dengan waktu kuliah saat ini di WITA
    const campusClock = getCampusTimeInfo();
    const currentHour = parseInt(campusClock.timeString24.split(':')[0], 10);
    if (currentHour < 10) {
      setSearchStartTime('08:00');
      setSearchEndTime('09:40');
    } else if (currentHour < 12) {
      setSearchStartTime('09:40');
      setSearchEndTime('11:20');
    } else if (currentHour < 15) {
      setSearchStartTime('13:20');
      setSearchEndTime('15:00');
    } else {
      setSearchStartTime('15:00');
      setSearchEndTime('16:40');
    }
  }, [loadSchedule, loadBookings]);

  // Handler membuka modal booking dari kartu ruangan atau tombol navigasi
  const handleOpenBookingModal = (
    room?: string,
    date?: string,
    start?: string,
    end?: string
  ) => {
    if (room) setModalInitialRoom(room);
    else setModalInitialRoom('');

    if (date) setModalInitialDate(date);
    else setModalInitialDate(searchDate);

    if (start) setModalInitialStartTime(start);
    else setModalInitialStartTime(searchStartTime);

    if (end) setModalInitialEndTime(end);
    else setModalInitialEndTime(searchEndTime);

    setIsBookingModalOpen(true);
  };

  // Handler setelah pemesanan ruangan berhasil
  const handleBookingSuccess = (newBooking: BookingItem) => {
    setBookings(prev => [newBooking, ...prev.filter(b => b.id !== newBooking.id)]);
    setBookingSuccessMsg(
      `Peminjaman ruangan ${newBooking.ruangan} untuk tanggal ${newBooking.tanggal} (${newBooking.jam_mulai}–${newBooking.jam_selesai} WITA) berhasil disimpan!`
    );
    // Pengguna tetap berada di halaman Cari & Booking yang terintegrasi
    setActiveTab('dashboard');
  };

  // Hitung jumlah booking aktif untuk badge di sidebar
  const activeBookingCount = bookings.filter(b => b.status === 'aktif').length;

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-stone-950 text-stone-800 dark:text-stone-100 flex flex-col font-sans transition-colors duration-150">
      {/* 1. Sidebar Navigasi Responsif (Desktop w-64 di Sisi Kiri, Mobile Drawer saat Dibuka) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onRefreshSchedule={() => loadSchedule(true)}
        isRefreshing={isScheduleLoading}
        theme={theme}
        setTheme={setTheme}
        isDark={isDark}
        activeBookingCount={activeBookingCount}
      />

      {/* 2. Area Konten Utama (md:pl-64 untuk memberi ruang pada Sidebar Desktop) */}
      <div className="md:pl-64 flex-1 flex flex-col min-w-0 transition-all duration-150">
        {/* Header Atas */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isMobileOpen={isMobileOpen}
          setIsMobileOpen={setIsMobileOpen}
          onRefreshSchedule={() => loadSchedule(true)}
          isRefreshing={isScheduleLoading}
          theme={theme}
          setTheme={setTheme}
          isDark={isDark}
        />

        {/* Banner Peringatan jika CSV Google Sheets gagal dimuat */}
        {scheduleError && (
          <div className="bg-rose-50/90 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 py-3.5 px-4 sm:px-6 transition-colors">
            <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>
                  <strong>Jadwal belum berhasil dimuat:</strong> {scheduleError}
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <Button
                  variant="danger"
                  size="sm"
                  icon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => loadSchedule(true)}
                >
                  Coba Lagi
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Konten Halaman Aktif (Cari & Booking Terpadu, atau Jadwal Kuliah) */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6 pb-12">
          {activeTab === 'dashboard' && (
            <DashboardView
              schedules={schedules}
              bookings={bookings}
              searchDate={searchDate}
              setSearchDate={setSearchDate}
              searchStartTime={searchStartTime}
              setSearchStartTime={setSearchStartTime}
              searchEndTime={searchEndTime}
              setSearchEndTime={setSearchEndTime}
              onNavigateToSchedule={() => setActiveTab('schedule')}
              onRefreshSchedule={() => loadSchedule(true)}
              isScheduleLoading={isScheduleLoading}
              scheduleError={scheduleError}
              isDbConnected={isDbConnected}
              onOpenBookingModal={handleOpenBookingModal}
              onRefreshBookings={loadBookings}
              isBookingsLoading={isBookingsLoading}
              recentBookingSuccessMessage={bookingSuccessMsg}
              onClearSuccessMessage={() => setBookingSuccessMsg(null)}
            />
          )}

          {activeTab === 'schedule' && (
            <ScheduleView
              schedules={schedules}
              onRefresh={() => loadSchedule(true)}
              isRefreshing={isScheduleLoading}
              lastUpdated={lastUpdated}
            />
          )}
        </main>

        {/* Modal Booking Ruangan Terpadu */}
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          initialRoom={modalInitialRoom}
          initialDate={modalInitialDate}
          initialStartTime={modalInitialStartTime}
          initialEndTime={modalInitialEndTime}
          schedules={schedules}
          bookings={bookings}
          onBookingSuccess={handleBookingSuccess}
          isDbConnected={isDbConnected}
        />

        {/* Footer Bersih dan Tenang */}
        <footer className="border-t border-stone-200/80 dark:border-stone-800 bg-[#f8f9fa] dark:bg-stone-900 py-6 mt-auto transition-colors">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500 dark:text-stone-400">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-stone-900 dark:text-white">sched</span>
              <span className="bg-orange-500 text-white font-extrabold px-1.5 py-0.5 rounded text-[11px]">
                U
              </span>
              <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
              <span>Sistem Ruang & Jadwal Kuliah Jurusan</span>
            </div>

            <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
              <span className="font-medium">WITA (UTC+08)</span>
              <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
              <span>Format 24 Jam Baku</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
