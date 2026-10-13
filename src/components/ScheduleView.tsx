import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  RefreshCw,
  AlertTriangle,
  Building2,
  User,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Filter,
  CheckCircle2,
  Clock3,
  Coffee,
  CalendarCheck2,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ScheduleItem } from '../types';
import { extractUniqueRooms, findScheduleClashesInDataset } from '../utils/timeConflict';
import { getCampusTimeInfo, formatTimeRangeWita } from '../utils/clock';
import {
  extractUniqueClasses,
  extractUniqueLecturers,
  getLecturersAnalysis,
} from '../utils/academicSchedule';
import { Button } from './Button';
import { ScheduleChangeModal } from './ScheduleChangeModal';

interface ScheduleViewProps {
  schedules: ScheduleItem[];
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: string | null;
}

// Daftar hari perkuliahan aktif
const WEEKDAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Halaman Jadwal Perkuliahan Jurusan & Smart Academic Scheduling SchedU
 *
 * Fitur Utama:
 * 1. Schedule Discovery: Pencarian multi-kriteria (Mata Kuliah, Kode MK, Dosen, Kelas, Ruangan).
 * 2. Filter Fleksibel: Filter per Hari (atau Semua Hari), Ruangan, Kelas, dan Dosen.
 * 3. Ketersediaan Dosen (Lecturer Availability): Menganalisis ketersediaan waktu luang dosen,
 *    status mengajar saat ini (WITA), dan jadwal konsultasi/bimbingan mahasiswa.
 * 4. Arsitektur Perubahan Jadwal Terverifikasi Admin: Safeguard read-only dengan modal alur
 *    tata kelola akademik untuk persiapan fitur masa depan tanpa write-back langsung ke Google Sheets.
 * 5. Two-Color Theme-Aware Alternating System: Preservasi visual dua warna bergantian konsisten
 *    (Theme Surface vs SchedU Orange).
 */
export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  onRefresh,
  isRefreshing,
  lastUpdated,
}) => {
  // Ambil nama hari berjalan di WITA sebagai tab awal otomatis
  const todayInfo = getCampusTimeInfo();
  const initialDay = WEEKDAYS.includes(todayInfo.dayName) ? todayInfo.dayName : 'Senin';

  // State tampilan & filter
  const [viewMode, setViewMode] = useState<'schedule' | 'lecturers'>('schedule');
  const [selectedDay, setSelectedDay] = useState<string>(initialDay); // 'Semua' atau nama hari
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('Semua');
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [selectedLecturer, setSelectedLecturer] = useState<string>('Semua');

  // State untuk modal usulan perubahan jadwal (fitur mendatang)
  const [isChangeModalOpen, setIsChangeModalOpen] = useState<boolean>(false);
  const [scheduleForChange, setScheduleForChange] = useState<ScheduleItem | null>(null);

  // State expand kartu dosen
  const [expandedLecturer, setExpandedLecturer] = useState<string | null>(null);

  // Filter ketersediaan dosen
  const [lecturerStatusFilter, setLecturerStatusFilter] = useState<string>('Semua');

  // Ekstraksi data unik dari Google Sheets
  const uniqueRooms = useMemo(() => extractUniqueRooms(schedules), [schedules]);
  const uniqueClasses = useMemo(() => extractUniqueClasses(schedules), [schedules]);
  const uniqueLecturers = useMemo(() => extractUniqueLecturers(schedules), [schedules]);

  // Periksa apakah ada jadwal yang bertumpang tindih dari sumber Google Sheets
  const datasetClashes = useMemo(() => findScheduleClashesInDataset(schedules), [schedules]);

  // Analisis komprehensif ketersediaan dan beban mengajar seluruh dosen
  const lecturersAnalysis = useMemo(() => {
    return getLecturersAnalysis(schedules, todayInfo.dayName, todayInfo.timeString24);
  }, [schedules, todayInfo.dayName, todayInfo.timeString24]);

  // Navigasi hari
  const handlePrevDay = () => {
    if (selectedDay === 'Semua') {
      setSelectedDay('Senin');
      return;
    }
    const currentIndex = WEEKDAYS.indexOf(selectedDay);
    if (currentIndex > 0) {
      setSelectedDay(WEEKDAYS[currentIndex - 1]);
    } else {
      setSelectedDay(WEEKDAYS[WEEKDAYS.length - 1]);
    }
  };

  const handleNextDay = () => {
    if (selectedDay === 'Semua') {
      setSelectedDay('Senin');
      return;
    }
    const currentIndex = WEEKDAYS.indexOf(selectedDay);
    if (currentIndex < WEEKDAYS.length - 1) {
      setSelectedDay(WEEKDAYS[currentIndex + 1]);
    } else {
      setSelectedDay(WEEKDAYS[0]);
    }
  };

  const handleGoToday = () => {
    if (WEEKDAYS.includes(todayInfo.dayName)) {
      setSelectedDay(todayInfo.dayName);
    } else {
      setSelectedDay('Senin');
    }
  };

  // Reset semua filter pencarian
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRoom('Semua');
    setSelectedClass('Semua');
    setSelectedLecturer('Semua');
    setSelectedDay(initialDay);
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedRoom !== 'Semua' ||
    selectedClass !== 'Semua' ||
    selectedLecturer !== 'Semua' ||
    selectedDay === 'Semua';

  // Filter jadwal berdasarkan kriteria aktif
  const filteredList = useMemo(() => {
    return schedules
      .filter(item => {
        // Filter hari
        if (selectedDay !== 'Semua' && item.Hari.toLowerCase() !== selectedDay.toLowerCase()) {
          return false;
        }

        // Filter ruangan
        if (selectedRoom !== 'Semua' && item.Ruangan !== selectedRoom) {
          return false;
        }

        // Filter kelas
        if (selectedClass !== 'Semua' && item.Kelas !== selectedClass) {
          return false;
        }

        // Filter dosen
        if (selectedLecturer !== 'Semua' && item.Dosen !== selectedLecturer) {
          return false;
        }

        // Filter pencarian teks bebas
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matches =
            item.Mata_Kuliah.toLowerCase().includes(q) ||
            item.Kode_Mata_Kuliah.toLowerCase().includes(q) ||
            item.Dosen.toLowerCase().includes(q) ||
            item.Kelas.toLowerCase().includes(q) ||
            item.Ruangan.toLowerCase().includes(q);
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (selectedDay === 'Semua') {
          const dayOrder = WEEKDAYS.indexOf(a.Hari) - WEEKDAYS.indexOf(b.Hari);
          if (dayOrder !== 0) return dayOrder;
        }
        return a.Mulai.localeCompare(b.Mulai);
      });
  }, [schedules, selectedDay, selectedRoom, selectedClass, selectedLecturer, searchQuery]);

  // Filter daftar analisis dosen
  const filteredLecturers = useMemo(() => {
    return lecturersAnalysis.filter(lecturer => {
      // Filter status
      if (lecturerStatusFilter === 'teaching_now' && lecturer.currentStatus !== 'teaching_now') {
        return false;
      }
      if (
        lecturerStatusFilter === 'no_schedule_today' &&
        lecturer.currentStatus !== 'no_schedule_today'
      ) {
        return false;
      }

      // Filter pencarian nama dosen atau mata kuliah yang diampu
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = lecturer.dosenName.toLowerCase().includes(q);
        const matchesCourse = lecturer.scheduleItems.some(
          s =>
            s.Mata_Kuliah.toLowerCase().includes(q) ||
            s.Kode_Mata_Kuliah.toLowerCase().includes(q) ||
            s.Ruangan.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesCourse) return false;
      }

      return true;
    });
  }, [lecturersAnalysis, lecturerStatusFilter, searchQuery]);

  // Hitung metrik ringkasan
  const summaryMetrics = useMemo(() => {
    const uniqueCourses = new Set(filteredList.map(s => s.Kode_Mata_Kuliah || s.Mata_Kuliah));
    const uniqueLects = new Set(filteredList.map(s => s.Dosen).filter(Boolean));
    const uniqueRoomsInList = new Set(filteredList.map(s => s.Ruangan).filter(Boolean));
    return {
      totalJadwal: filteredList.length,
      totalMataKuliah: uniqueCourses.size,
      totalDosen: uniqueLects.size,
      totalRuangan: uniqueRoomsInList.size,
    };
  }, [filteredList]);

  const handleOpenChangeModal = (schedule: ScheduleItem) => {
    setScheduleForChange(schedule);
    setIsChangeModalOpen(true);
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 1. Header Banner & Sinkronisasi */}
      <div className="bg-white dark:bg-stone-900 rounded-xl p-5 sm:p-6 border border-stone-200/80 dark:border-stone-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">
                Smart Academic Scheduling
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Calendar className="w-6 h-6 text-orange-500 shrink-0" />
              <span>Jadwal Perkuliahan Jurusan</span>
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Data tersinkronisasi otomatis dari Google Sheets resmi jurusan (Waktu Kampus WITA).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {lastUpdated && (
              <span className="text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
                Diperbarui: {lastUpdated}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              isLoading={isRefreshing}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
              onClick={onRefresh}
            >
              Refresh Jadwal
            </Button>
          </div>
        </div>

        {/* Notifikasi tumpang tindih dari Google Sheets jika ada */}
        {datasetClashes.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-lg text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                Catatan: Terdeteksi {datasetClashes.length} jadwal tumpang tindih pada Google Sheets jurusan.
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300">
              Jadwal ditampilkan apa adanya agar dapat dikoordinasikan dengan pengelola jadwal jurusan.
            </p>
          </div>
        )}
      </div>

      {/* 2. Mode Selector: [Tabel Jadwal Perkuliahan] vs [Ketersediaan Dosen] */}
      <div className="bg-white dark:bg-stone-900 p-2 sm:p-2.5 rounded-xl border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('schedule')}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'schedule'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Calendar className="w-4 h-4 text-orange-500" />
            <span>Matriks Jadwal Kuliah</span>
            <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {filteredList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('lecturers')}
            className={`px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'lecturers'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <User className="w-4 h-4 text-orange-500" />
            <span>Ketersediaan Dosen</span>
            <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
              {uniqueLecturers.length}
            </span>
          </button>
        </div>

        {/* Ringkasan Waktu Kampus Sekarang */}
        <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>WITA Saat Ini:</span>
          <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
            {todayInfo.dayName}, {todayInfo.timeString24}
          </span>
        </div>
      </div>

      {/* 3. Panel Kontrol Khusus Mode Tabel Jadwal */}
      {viewMode === 'schedule' && (
        <>
          {/* Navigasi Hari */}
          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-3 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ChevronLeft className="w-4 h-4" />}
                  onClick={handlePrevDay}
                  title="Hari Sebelumnya"
                >
                  <span className="hidden sm:inline">Sebelumnya</span>
                </Button>

                <Button
                  variant={selectedDay === todayInfo.dayName ? 'primary' : 'outline'}
                  size="sm"
                  icon={<Clock className="w-3.5 h-3.5" />}
                  onClick={handleGoToday}
                >
                  <span>Hari Ini ({todayInfo.dayName})</span>
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ChevronRight className="w-4 h-4" />}
                  iconPosition="right"
                  onClick={handleNextDay}
                  title="Hari Berikutnya"
                >
                  <span className="hidden sm:inline">Berikutnya</span>
                </Button>
              </div>

              <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2">
                <span>Melihat:</span>
                <span className="text-stone-900 dark:text-stone-100 font-bold text-sm">
                  {selectedDay === 'Semua' ? 'Semua Hari (Mingguan)' : selectedDay}
                </span>
                {selectedDay === 'Semua' && (
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-semibold">
                    Full Week
                  </span>
                )}
              </div>
            </div>

            {/* Tab Hari (Semua Hari + Senin–Sabtu) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedDay('Semua')}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer min-h-[38px] ${
                  selectedDay === 'Semua'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                <span>Semua Hari</span>
                <span
                  className={`text-xs font-mono tabular-nums ${
                    selectedDay === 'Semua' ? 'text-orange-100' : 'text-stone-400 dark:text-stone-500'
                  }`}
                >
                  {schedules.length}
                </span>
              </button>

              {WEEKDAYS.map(day => {
                const count = schedules.filter(s => s.Hari.toLowerCase() === day.toLowerCase()).length;
                const isActive = selectedDay === day;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer min-h-[38px] ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span>{day}</span>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isActive ? 'text-orange-100' : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Pencarian Komprehensif (Multi-Filter Discovery) */}
          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-3 transition-colors">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Input Pencarian Bebas */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari mata kuliah, kode MK, dosen, atau kelas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs sm:text-sm outline-none focus:bg-white dark:focus:bg-stone-800 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-medium text-stone-900 dark:text-stone-100 min-h-[40px]"
                />
              </div>

              {/* Baris Filter Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Filter Ruangan */}
                <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5">
                  <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <select
                    value={selectedRoom}
                    onChange={e => setSelectedRoom(e.target.value)}
                    className="w-full text-xs bg-transparent outline-none font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
                  >
                    <option value="Semua">Semua Ruangan</option>
                    {uniqueRooms.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Filter Kelas */}
                <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <select
                    value={selectedClass}
                    onChange={e => setSelectedClass(e.target.value)}
                    className="w-full text-xs bg-transparent outline-none font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {uniqueClasses.map(cls => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filter Dosen Pengampu */}
                <div className="flex items-center gap-1.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg px-2.5 py-1.5">
                  <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <select
                    value={selectedLecturer}
                    onChange={e => setSelectedLecturer(e.target.value)}
                    className="w-full text-xs bg-transparent outline-none font-semibold text-stone-800 dark:text-stone-200 cursor-pointer"
                  >
                    <option value="Semua">Semua Dosen</option>
                    {uniqueLecturers.map(dosen => (
                      <option key={dosen} value={dosen}>
                        {dosen}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Bar Indikator Hasil & Tombol Reset Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800 text-xs">
              <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400 font-mono text-[11px]">
                <span>
                  Hasil: <strong className="text-stone-900 dark:text-stone-100">{summaryMetrics.totalJadwal}</strong> jadwal
                </span>
                <span>·</span>
                <span>
                  <strong className="text-stone-900 dark:text-stone-100">{summaryMetrics.totalMataKuliah}</strong> mata kuliah
                </span>
                <span>·</span>
                <span>
                  <strong className="text-stone-900 dark:text-stone-100">{summaryMetrics.totalDosen}</strong> dosen
                </span>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-semibold cursor-pointer"
                >
                  Reset Semua Filter
                </button>
              )}
            </div>
          </div>

          {/* 4. Tabel Jadwal Perkuliahan (Two-Color Theme-Aware Alternating System) */}
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-xl p-10 text-center border border-dashed border-stone-300 dark:border-stone-800 transition-colors">
              <BookOpen className="w-8 h-8 text-stone-400 mx-auto mb-2.5" />
              <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                Tidak Ada Jadwal Perkuliahan
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                Tidak ditemukan jadwal kuliah dengan filter aktif saat ini. Coba sesuaikan kata kunci atau atur ulang filter.
              </p>
              {hasActiveFilters && (
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Tampilkan Semua Jadwal
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Tampilan Desktop Table: Two-Color Theme-Aware Alternating Rows */}
              <div className="hidden lg:block bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 overflow-hidden shadow-xs transition-colors">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-100 dark:bg-stone-800 border-b-2 border-stone-300 dark:border-stone-700 text-[11px] font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                      {selectedDay === 'Semua' && <th className="py-3 px-4">Hari</th>}
                      <th className="py-3 px-4">Jam Kuliah (WITA)</th>
                      <th className="py-3 px-4">Mata Kuliah</th>
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4">Ruangan</th>
                      <th className="py-3 px-4">Dosen Pengampu</th>
                      <th className="py-3 px-4 text-right">Kelola</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs">
                    {filteredList.map((item, index) => {
                      const isBrandRow = index % 2 === 1;
                      return (
                        <tr
                          key={item.id}
                          className={`border-b transition-colors cursor-default ${
                            isBrandRow
                              ? 'bg-[#FFF4EB] dark:bg-orange-950/40 border-orange-200/60 dark:border-orange-950/50 hover:bg-[#FFEADA] dark:hover:bg-orange-950/60'
                              : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                          }`}
                        >
                          {selectedDay === 'Semua' && (
                            <td className="py-3 px-4 whitespace-nowrap font-bold text-stone-900 dark:text-stone-100">
                              {item.Hari}
                            </td>
                          )}

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                              {formatTimeRangeWita(item.Mulai, item.Selesai)}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-bold text-stone-900 dark:text-stone-100 leading-snug">
                              {item.Mata_Kuliah}
                            </div>
                            <div
                              className={`text-[11px] font-mono tabular-nums mt-0.5 font-medium ${
                                isBrandRow
                                  ? 'text-orange-900/80 dark:text-orange-300/80'
                                  : 'text-stone-600 dark:text-stone-400'
                              }`}
                            >
                              {item.Kode_Mata_Kuliah}
                            </div>
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap font-mono tabular-nums font-bold text-stone-800 dark:text-stone-200">
                            {item.Kelas}
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {item.Ruangan}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-stone-700 dark:text-stone-300 font-medium leading-normal">
                            {item.Dosen}
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenChangeModal(item)}
                              title="Usulan Perubahan Jadwal Terverifikasi Admin (Fitur Mendatang)"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-stone-500 hover:text-orange-600 dark:text-stone-400 dark:hover:text-orange-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                            >
                              <Lock className="w-3 h-3 text-stone-400" />
                              <span>Usul Revisi</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tampilan Mobile Kartu: Two-Color Theme-Aware Alternating Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-3">
                {filteredList.map((item, index) => {
                  const isBrandRow = index % 2 === 1;
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl p-4 space-y-2.5 transition-all shadow-xs ${
                        isBrandRow
                          ? 'bg-[#FFF4EB] dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-900/40 hover:bg-[#FFEADA] dark:hover:bg-orange-950/60'
                          : 'bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {selectedDay === 'Semua' && (
                            <span className="font-bold text-orange-600 dark:text-orange-400">
                              {item.Hari}
                            </span>
                          )}
                          <span className="font-mono tabular-nums font-bold text-stone-900 dark:text-stone-100">
                            {formatTimeRangeWita(item.Mulai, item.Selesai)}
                          </span>
                        </div>
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {item.Ruangan}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-snug">
                          {item.Mata_Kuliah}
                        </h4>
                        <div className="flex items-center gap-2 text-xs mt-1 font-medium">
                          <span
                            className={`font-mono tabular-nums ${
                              isBrandRow
                                ? 'text-orange-900/80 dark:text-orange-300/80'
                                : 'text-stone-600 dark:text-stone-400'
                            }`}
                          >
                            {item.Kode_Mata_Kuliah}
                          </span>
                          <span className="text-stone-400 dark:text-stone-600" aria-hidden="true">·</span>
                          <span className="text-stone-600 dark:text-stone-400">
                            Kelas <strong className="font-mono text-stone-900 dark:text-stone-100 font-bold">{item.Kelas}</strong>
                          </span>
                        </div>
                      </div>

                      <div
                        className={`pt-2 border-t flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 ${
                          isBrandRow
                            ? 'border-orange-200/60 dark:border-orange-900/40'
                            : 'border-stone-200/80 dark:border-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                          <span className="truncate font-medium">{item.Dosen}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenChangeModal(item)}
                          className="shrink-0 text-[11px] font-medium text-stone-500 hover:text-orange-600 dark:text-stone-400 flex items-center gap-1"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Usul Revisi</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* 5. Mode Ketersediaan Dosen (Lecturer Availability & Teaching Load) */}
      {viewMode === 'lecturers' && (
        <div className="space-y-4">
          {/* Header Info & Filter Ketersediaan */}
          <div className="bg-white dark:bg-stone-900 p-4 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-3 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-500" />
                  <span>Direktori Ketersediaan & Beban Mengajar Dosen</span>
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Cari jadwal mengajar dosen dan temukan waktu luang untuk keperluan konsultasi/bimbingan akademik mahasiswa.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'Semua', label: 'Semua Dosen' },
                  { id: 'teaching_now', label: 'Sedang Mengajar' },
                  { id: 'no_schedule_today', label: 'Tersedia Hari Ini' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLecturerStatusFilter(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      lecturerStatusFilter === opt.id
                        ? 'bg-orange-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Pencarian Dosen */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama dosen atau mata kuliah yang diampu..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs sm:text-sm outline-none focus:bg-white dark:focus:bg-stone-800 focus:ring-1 focus:ring-orange-500 font-medium text-stone-900 dark:text-stone-100"
              />
            </div>
          </div>

          {/* Grid Kartu Dosen */}
          {filteredLecturers.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-xl p-10 text-center border border-dashed border-stone-300 dark:border-stone-800">
              <User className="w-8 h-8 text-stone-400 mx-auto mb-2" />
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Tidak ditemukan dosen dengan kata kunci atau filter saat ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredLecturers.map(lecturer => {
                const isExpanded = expandedLecturer === lecturer.dosenName;

                return (
                  <div
                    key={lecturer.dosenName}
                    className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200/80 dark:border-stone-800 p-4 space-y-3 shadow-xs transition-colors"
                  >
                    {/* Header Kartu Dosen */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-bold text-sm text-stone-900 dark:text-stone-100 leading-snug">
                          {lecturer.dosenName}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                          <span>{lecturer.totalClasses} Kelas</span>
                          <span>·</span>
                          <span>{lecturer.totalHours} Jam / Minggu</span>
                          <span>·</span>
                          <span>{lecturer.activeDays.join(', ')}</span>
                        </div>
                      </div>

                      {/* Status Ketersediaan Saat Ini di WITA */}
                      <div>
                        {lecturer.currentStatus === 'teaching_now' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>Sedang Mengajar</span>
                          </span>
                        )}

                        {lecturer.currentStatus === 'upcoming_today' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 text-[11px] font-semibold">
                            <Clock3 className="w-3.5 h-3.5 text-blue-500" />
                            <span>Ada Jadwal Hari Ini</span>
                          </span>
                        )}

                        {lecturer.currentStatus === 'finished_today' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-stone-500" />
                            <span>Selesai Mengajar</span>
                          </span>
                        )}

                        {lecturer.currentStatus === 'no_schedule_today' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                            <Coffee className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Tersedia Hari Ini</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rincian Status Mengajar Real-time */}
                    <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-2.5 text-xs space-y-1 text-stone-700 dark:text-stone-300 border border-stone-100 dark:border-stone-800">
                      {lecturer.currentStatus === 'teaching_now' && (
                        <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-200 font-medium">
                          <Building2 className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          <span>
                            Ruang <strong>{lecturer.currentRoom}</strong> · {lecturer.currentCourse} (Kelas {lecturer.currentClass})
                          </span>
                        </div>
                      )}

                      {lecturer.nextSchedule && (
                        <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-400 text-[11px]">
                          <CalendarCheck2 className="w-3.5 h-3.5 shrink-0 text-orange-500" />
                          <span>
                            Jadwal berikutnya: <strong>{lecturer.nextSchedule.hari}</strong> ({lecturer.nextSchedule.mulai}–{lecturer.nextSchedule.selesai} WITA) di {lecturer.nextSchedule.ruangan}
                          </span>
                        </div>
                      )}

                      {/* Rekomendasi Waktu Luang Konsultasi Hari Ini */}
                      {lecturer.freeSlotsToday.length > 0 && (
                        <div className="pt-1 border-t border-stone-200/60 dark:border-stone-700/60 text-[11px] text-stone-600 dark:text-stone-400">
                          <span className="font-semibold text-stone-800 dark:text-stone-200">
                            Waktu Luang Hari Ini:
                          </span>{' '}
                          {lecturer.freeSlotsToday.slice(0, 2).join(' · ')}
                        </div>
                      )}
                    </div>

                    {/* Tombol Expand Jadwal Kuliah Dosen */}
                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedLecturer(isExpanded ? null : lecturer.dosenName)
                        }
                        className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Tutup Daftar Jadwal' : `Lihat ${lecturer.scheduleItems.length} Kelas Mengajar`}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Accordion Daftar Kelas yang Diampu */}
                    {isExpanded && (
                      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-1.5 text-xs">
                        {lecturer.scheduleItems.map((sch, i) => (
                          <div
                            key={sch.id || i}
                            className="p-2 rounded bg-stone-100/70 dark:bg-stone-800/80 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                                {sch.Mata_Kuliah}
                              </div>
                              <div className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                                Kelas {sch.Kelas} · Ruang {sch.Ruangan}
                              </div>
                            </div>
                            <div className="text-right shrink-0 font-mono text-[11px] text-stone-700 dark:text-stone-300 font-bold">
                              <div>{sch.Hari}</div>
                              <div className="text-stone-500 font-normal">{sch.Mulai} - {sch.Selesai}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal Arsitektur Usulan Perubahan Jadwal Terverifikasi Admin (Fitur Mendatang) */}
      <ScheduleChangeModal
        isOpen={isChangeModalOpen}
        onClose={() => {
          setIsChangeModalOpen(false);
          setScheduleForChange(null);
        }}
        selectedSchedule={scheduleForChange}
      />
    </div>
  );
};
