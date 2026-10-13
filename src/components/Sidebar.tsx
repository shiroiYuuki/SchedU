import React, { useEffect, useRef } from 'react';
import { Search, Calendar, RefreshCw, X, Clock } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ThemeMode } from '../hooks/useTheme';
import { getCampusTimeInfo } from '../utils/clock';

export type NavTabType = 'dashboard' | 'schedule';

export interface SidebarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onRefreshSchedule: () => void;
  isRefreshing: boolean;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  activeBookingCount?: number;
}

/**
 * Komponen Sidebar Responsif SchedU (Anti-AI-Slop & Premium Design)
 *
 * Menerapkan:
 * 1. Zero-Pill & Metadata Discipline: Tidak ada pill enclosures tebal, badge sandwich, atau garis aksen border-l-4.
 * 2. Navigasi Bersih: State aktif menggunakan kontras latar halus dan ikon beraksen oranye.
 * 3. Typographic Hierarchy: Tabular numerals untuk hitungan dan waktu.
 * 4. Palet Netral Berkelas: Background stone halus yang teduh dan nyaman di mata.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  onRefreshSchedule,
  isRefreshing,
  theme,
  setTheme,
  isDark,
  activeBookingCount = 0,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Ambil waktu kampus WITA untuk indikator jam di sidebar
  const campusTime = getCampusTimeInfo();

  // Kelola interaksi drawer mobile
  useEffect(() => {
    if (!isMobileOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isMobileOpen, setIsMobileOpen]);

  const handleSelectTab = (tab: NavTabType) => {
    setActiveTab(tab);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  /**
   * Konten navigasi bersama (Desktop Sidebar maupun Mobile Drawer)
   */
  const renderNavContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full justify-between">
      {/* Bagian Atas: Brand & Menu Navigasi */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {/* Header Brand SchedU: Wordmark minimalis bersih */}
        <div className="px-5 py-4 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between">
          <div
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-2 cursor-pointer select-none group"
          >
            <div className="flex items-center">
              <span className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                sched
              </span>
              <span className="inline-flex items-center justify-center bg-orange-500 text-white font-extrabold text-base px-1.5 py-0.5 rounded ml-0.5 group-hover:bg-orange-600 transition-colors">
                U
              </span>
            </div>
            <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>
            <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              Sistem Ruang
            </span>
          </div>

          {/* Tombol Tutup Khusus Mobile Drawer */}
          {isMobile && (
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Tutup menu navigasi"
              className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Daftar Menu Utama */}
        <div className="px-3 py-4">
          <div className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 select-none">
            Navigasi
          </div>

          <nav className="space-y-1" aria-label="Navigasi Utama SchedU">
            {/* 1. Menu: Cari & Booking Ruangan */}
            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              aria-current={activeTab === 'dashboard' ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                activeTab === 'dashboard'
                  ? 'bg-stone-100 dark:bg-stone-800/90 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/70 dark:hover:bg-stone-800/50 font-normal'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Search
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeTab === 'dashboard'
                      ? 'text-orange-500 dark:text-orange-400'
                      : 'text-stone-400 dark:text-stone-500'
                  }`}
                />
                <span className="text-left leading-none">Cari & Booking Ruangan</span>
              </div>
              {activeBookingCount > 0 && (
                <span
                  title={`${activeBookingCount} booking aktif`}
                  className="text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400 font-medium"
                >
                  {activeBookingCount}
                </span>
              )}
            </button>

            {/* 2. Menu: Jadwal Kuliah */}
            <button
              type="button"
              onClick={() => handleSelectTab('schedule')}
              aria-current={activeTab === 'schedule' ? 'page' : undefined}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                activeTab === 'schedule'
                  ? 'bg-stone-100 dark:bg-stone-800/90 text-stone-900 dark:text-stone-100 font-semibold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100/70 dark:hover:bg-stone-800/50 font-normal'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Calendar
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    activeTab === 'schedule'
                      ? 'text-orange-500 dark:text-orange-400'
                      : 'text-stone-400 dark:text-stone-500'
                  }`}
                />
                <span className="text-left leading-none">Jadwal Kuliah</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Zona Waktu Kampus (Unboxed Metadata) */}
        <div className="px-5 py-3 border-t border-stone-200/60 dark:border-stone-800/80 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
            <span>WITA (UTC+08)</span>
          </div>
          <span className="font-mono tabular-nums font-semibold text-stone-800 dark:text-stone-200">
            {campusTime.timeString24}
          </span>
        </div>
      </div>

      {/* Bagian Bawah: Tombol Refresh Jadwal & Pengaturan Tema */}
      <div className="p-3 border-t border-stone-200/80 dark:border-stone-800 space-y-2 bg-[#f8f9fa] dark:bg-stone-900/60 shrink-0">
        {/* Tombol Segarkan Jadwal dari Google Sheets */}
        <button
          type="button"
          onClick={onRefreshSchedule}
          disabled={isRefreshing}
          aria-label="Segarkan data jadwal dari Google Sheets"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700/80 transition-colors cursor-pointer min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-orange-500 shrink-0 ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
          <span>{isRefreshing ? 'Memuat Jadwal…' : 'Segarkan Data'}</span>
        </button>

        {/* Pemilih Tema: Dark Mode / Light Mode / Sistem */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Tema Antarmuka
          </span>
          <ThemeToggle theme={theme} setTheme={setTheme} isDark={isDark} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. SIDEBAR TETAP DESKTOP (w-64 di Sisi Kiri Layar) */}
      <aside
        className="hidden md:flex flex-col fixed top-0 bottom-0 left-0 w-64 bg-[#f8f9fa] dark:bg-stone-900 border-r border-stone-200/80 dark:border-stone-800 z-30 transition-colors select-none"
        aria-label="Sidebar Navigasi Desktop"
      >
        {renderNavContent(false)}
      </aside>

      {/* 2. DRAWER NAVIGASI MOBILE (< 768px) */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Menu Navigasi Mobile"
        >
          {/* Backdrop Gelap dengan Blur */}
          <div
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div
            ref={drawerRef}
            className="relative flex-1 flex flex-col max-w-[280px] w-full bg-[#f8f9fa] dark:bg-stone-900 h-full shadow-2xl z-10 transition-transform animate-in slide-in-from-left duration-200"
          >
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
