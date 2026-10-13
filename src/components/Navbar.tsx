import React from 'react';
import { Menu, Search, Calendar, RefreshCw } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { NavTabType } from './Sidebar';

export interface NavbarProps {
  activeTab: NavTabType;
  setActiveTab: (tab: NavTabType) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  onRefreshSchedule: () => void;
  isRefreshing: boolean;
  theme?: ThemeMode;
  setTheme?: (theme: ThemeMode) => void;
  isDark?: boolean;
}

/**
 * Komponen Header Atas SchedU (Navbar)
 *
 * Menerapkan Top Bar Contract & Anti-AI-Slop:
 * - Satu baris, 3 zona teratur ([Brand/Page Title] — [Context Info] — [Actions]).
 * - Tidak ada decorative pulsing dots atau compound pill badges.
 * - Tipografi bersih dengan pemisah tipografis natural (`·`).
 */
export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isMobileOpen,
  setIsMobileOpen,
  onRefreshSchedule,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-[#f8f9fa]/90 dark:bg-stone-900/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Bagian Kiri: Mobile Hamburger + Brand | Desktop Judul Halaman */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Tombol Hamburger Khusus Mobile (< 768px) */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(prev => !prev)}
              aria-label={isMobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={isMobileOpen}
              className="md:hidden p-2 -ml-2 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-stone-200/60 dark:hover:bg-stone-800 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <Menu className="w-5 h-5 text-stone-700 dark:text-stone-200" />
            </button>

            {/* Logo SchedU untuk Mobile */}
            <div
              className="flex md:hidden items-center gap-1.5 cursor-pointer select-none"
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="text-lg font-black tracking-tight text-stone-900 dark:text-white">
                sched
              </span>
              <span className="inline-flex items-center justify-center bg-orange-500 text-white font-extrabold text-sm px-1.5 py-0.5 rounded">
                U
              </span>
            </div>

            {/* Judul Halaman & Breadcrumb untuk Desktop (>= 768px) */}
            <div className="hidden md:flex items-center gap-2 select-none min-w-0">
              <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-semibold text-sm">
                {activeTab === 'dashboard' ? (
                  <>
                    <Search className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Cari & Booking Ruangan</span>
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
                    <span>Jadwal Perkuliahan Jurusan</span>
                  </>
                )}
              </div>

              <span className="text-stone-300 dark:text-stone-700" aria-hidden="true">·</span>

              <span className="text-xs text-stone-500 dark:text-stone-400 font-normal truncate hidden lg:inline">
                {activeTab === 'dashboard'
                  ? 'Ketersediaan ruangan & peminjaman langsung'
                  : 'Sinkronisasi jadwal mingguan jurusan'}
              </span>
            </div>
          </div>

          {/* Bagian Kanan: Status Sumber Data & Tombol Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Status Sumber Data Unboxed (Bukan Pill/Candy Chip) */}
            <div className="hidden sm:inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span>Google Sheets Terhubung</span>
            </div>

            {/* Tombol Refresh Cepat */}
            <button
              type="button"
              onClick={onRefreshSchedule}
              disabled={isRefreshing}
              title="Perbarui Jadwal dari Google Sheets"
              aria-label="Refresh Jadwal"
              className="p-2 text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/60 dark:hover:bg-stone-800 rounded-lg transition-colors cursor-pointer min-h-[38px] min-w-[38px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-500' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
