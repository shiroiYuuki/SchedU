import React, { useState, useMemo } from 'react';
import { Search, Calendar, Clock, CheckCircle2, XCircle, AlertTriangle, Filter, Sparkles, PlusCircle } from 'lucide-react';
import { ScheduleItem, BookingItem, RoomAvailabilityResult } from '../types';
import {
  extractUniqueRooms,
  checkRoomAvailability,
  getIndonesianDayName,
  formatIndonesianDate,
  timeToMinutes,
} from '../utils/timeConflict';
import { formatTimeRangeWita } from '../utils/clock';
import { Button } from './Button';
import { TimeInput24 } from './TimeInput24';

interface RoomFinderViewProps {
  schedules: ScheduleItem[];
  bookings: BookingItem[];
  searchDate: string;
  setSearchDate: (date: string) => void;
  searchStartTime: string;
  setSearchStartTime: (time: string) => void;
  searchEndTime: string;
  setSearchEndTime: (time: string) => void;
  onOpenBookingModal: (room: string, date: string, start: string, end: string) => void;
  isScheduleLoading: boolean;
  scheduleError: string | null;
}

export const RoomFinderView: React.FC<RoomFinderViewProps> = ({
  schedules,
  bookings,
  searchDate,
  setSearchDate,
  searchStartTime,
  setSearchStartTime,
  searchEndTime,
  setSearchEndTime,
  onOpenBookingModal,
  isScheduleLoading,
  scheduleError,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'available' | 'unavailable'>('all');
  const [selectedRoomCategory, setSelectedRoomCategory] = useState<'all' | 'teori' | 'lab' | 'aula'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Extract all rooms from current dataset
  const allRooms = useMemo(() => {
    return extractUniqueRooms(schedules, bookings);
  }, [schedules, bookings]);

  // Validate start and end times
  const isValidTimeRange = useMemo(() => {
    if (!searchStartTime || !searchEndTime) return false;
    return timeToMinutes(searchEndTime) > timeToMinutes(searchStartTime);
  }, [searchStartTime, searchEndTime]);

  // Compute availability for every room based on active date and time range
  const availabilityResults = useMemo<RoomAvailabilityResult[]>(() => {
    if (!isValidTimeRange || schedules.length === 0 || !searchDate) {
      return [];
    }

    return allRooms.map(room => {
      return checkRoomAvailability(
        room,
        searchDate,
        searchStartTime,
        searchEndTime,
        schedules,
        bookings
      );
    });
  }, [allRooms, searchDate, searchStartTime, searchEndTime, schedules, bookings, isValidTimeRange]);

  // Filter results
  const filteredResults = useMemo(() => {
    return availabilityResults.filter(item => {
      // Status filter
      if (filterType === 'available' && !item.isAvailable) return false;
      if (filterType === 'unavailable' && item.isAvailable) return false;

      // Category filter
      const roomLower = item.roomName.toLowerCase();
      if (selectedRoomCategory === 'teori' && (roomLower.includes('lab') || roomLower.includes('aula'))) return false;
      if (selectedRoomCategory === 'lab' && !roomLower.includes('lab')) return false;
      if (selectedRoomCategory === 'aula' && !roomLower.includes('aula')) return false;

      // Query filter
      if (searchQuery.trim() && !roomLower.includes(searchQuery.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [availabilityResults, filterType, selectedRoomCategory, searchQuery]);

  const availableCount = availabilityResults.filter(r => r.isAvailable).length;
  const unavailableCount = availabilityResults.length - availableCount;
  const targetDay = getIndonesianDayName(searchDate);

  // Time preset helper
  const applyPreset = (start: string, end: string) => {
    setSearchStartTime(start);
    setSearchEndTime(end);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Search Header Form */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-stone-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight flex items-center space-x-2">
              <span className="p-2 bg-orange-500 text-white rounded-xl shadow-xs">
                <Search className="w-5 h-5" />
              </span>
              <span>Pencarian Ruangan Kosong</span>
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 mt-1">
              Sistem akan memverifikasi seluruh jadwal kuliah jurusan dan peminjaman aktif untuk mencegah bentrok waktu.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <span className="text-xs font-semibold px-3 py-1.5 bg-orange-50 border border-orange-200 text-orange-800 rounded-lg">
              Hari {targetDay} — {formatIndonesianDate(searchDate)}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Tanggal Pengecekan</span>
            </label>
            <input
              type="date"
              value={searchDate}
              onChange={e => setSearchDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm font-semibold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Jam Mulai</span>
            </label>
            <TimeInput24
              id="room-finder-start-time"
              value={searchStartTime}
              onChange={setSearchStartTime}
              ariaLabel="Jam Mulai"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Jam Selesai</span>
            </label>
            <TimeInput24
              id="room-finder-end-time"
              value={searchEndTime}
              onChange={setSearchEndTime}
              ariaLabel="Jam Selesai"
            />
          </div>
        </div>

        {/* Time Presets Chips */}
        <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-600 flex items-center space-x-1 mr-1">
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span>Preset Sesi Kuliah:</span>
          </span>
          {[
            { start: '07:30', end: '10:00' },
            { start: '10:15', end: '12:45' },
            { start: '13:15', end: '15:45' },
            { start: '16:00', end: '18:30' },
          ].map(preset => {
            const isActive = searchStartTime === preset.start && searchEndTime === preset.end;
            return (
              <button
                key={`${preset.start}-${preset.end}`}
                type="button"
                onClick={() => applyPreset(preset.start, preset.end)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer min-h-[34px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  isActive
                    ? 'bg-orange-500 text-white font-bold'
                    : 'bg-stone-100 hover:bg-orange-100 hover:text-orange-800 text-stone-700'
                }`}
              >
                {preset.start}–{preset.end}
              </button>
            );
          })}
        </div>

        {/* Validation Warning if invalid time */}
        {!isValidTimeRange && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-rose-700 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              Waktu selesai ({searchEndTime}) harus lebih akhir dari waktu mulai ({searchStartTime}). Silakan sesuaikan jam pencarian.
            </span>
          </div>
        )}

        {/* Warning if schedule data is missing */}
        {schedules.length === 0 && !isScheduleLoading && (
          <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center space-x-2 text-amber-800 text-xs font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              Peringatan: Data jadwal kuliah belum tersedia atau gagal dimuat. Sesuai aturan schedU, status ruangan tidak dapat dinyatakan kosong sampai jadwal terverifikasi.
            </span>
          </div>
        )}
      </div>

      {/* Filter and Summary Bar */}
      {isValidTimeRange && schedules.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
          {/* Quick counts */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold text-stone-900">Hasil Pencarian:</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">
              {availableCount} Kosong
            </span>
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md">
              {unavailableCount} Terpakai
            </span>
            <span className="text-stone-500 hidden sm:inline">
              (Total {availabilityResults.length} ruangan)
            </span>
          </div>

          {/* Filter options */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search room name */}
            <input
              type="text"
              placeholder="Cari nama ruangan..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="text-xs px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg outline-none focus:ring-1 focus:ring-orange-500 w-36 sm:w-44"
            />

            {/* Status Filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-medium text-stone-700 outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="available">Hanya Kosong ({availableCount})</option>
              <option value="unavailable">Hanya Terpakai ({unavailableCount})</option>
            </select>

            {/* Category Filter */}
            <select
              value={selectedRoomCategory}
              onChange={e => setSelectedRoomCategory(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg font-medium text-stone-700 outline-none"
            >
              <option value="all">Semua Tipe Ruang</option>
              <option value="teori">Ruang Kuliah / Teori</option>
              <option value="lab">Laboratorium</option>
              <option value="aula">Aula Jurusan</option>
            </select>
          </div>
        </div>
      )}

      {/* Results List */}
      {!isValidTimeRange ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-stone-300">
          <Clock className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Tentukan Rentang Waktu yang Valid</h3>
          <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
            Masukkan jam mulai dan jam selesai dengan benar di atas untuk memeriksa jadwal kuliah dan peminjaman secara otomatis.
          </p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-stone-200">
          <Filter className="w-10 h-10 text-stone-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-stone-800">Tidak Ada Ruangan yang Sesuai Filter</h3>
          <p className="text-xs text-stone-500 mt-1">
            Coba ubah filter pencarian atau pilih tipe ruangan yang berbeda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResults.map(item => (
            <div
              key={item.roomName}
              className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                item.isAvailable
                  ? 'bg-white border-emerald-300 shadow-xs hover:border-emerald-400 hover:shadow-md'
                  : 'bg-stone-50/80 border-rose-200/80 shadow-xs'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-stone-900 tracking-tight">
                      {item.roomName}
                    </h3>
                    <span className="text-xs text-stone-500 font-medium">
                      Rentang: {formatTimeRangeWita(searchStartTime, searchEndTime)}
                    </span>
                  </div>

                  {/* Status Badge */}
                  {item.isAvailable ? (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-200 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Kosong</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-3 py-1 bg-rose-100 text-rose-800 text-xs font-extrabold rounded-full border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Tidak Tersedia</span>
                    </span>
                  )}
                </div>

                {/* Details Section */}
                {item.isAvailable ? (
                  <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100/80 mb-4 text-xs text-emerald-900">
                    <p className="font-semibold flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Ruangan siap dipakai</span>
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1 pl-5.5">
                      Bebas dari jadwal perkuliahan dan belum ada peminjaman aktif pada jam ini.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Bentrok Dengan ({item.conflicts.length}):</span>
                    </div>

                    {item.conflicts.map((conflict, cIdx) => (
                      <div
                        key={cIdx}
                        className="bg-white rounded-xl p-3 border border-rose-200 text-xs shadow-2xs space-y-1.5"
                      >
                        <div className="font-extrabold text-stone-900 text-sm leading-snug break-words">
                          {conflict.mataKuliah}
                        </div>
                        <div className="space-y-1 text-[11px] text-stone-700 pt-1 border-t border-rose-100">
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-stone-500">Kelas:</span>
                            <span className="font-bold text-stone-900 bg-stone-100 px-1.5 py-0.2 rounded font-mono">
                              {conflict.kelas || '-'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-stone-500">Ruangan:</span>
                            <span className="font-bold text-stone-900">{conflict.ruangan}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="font-semibold text-stone-500">Waktu:</span>
                            <span className="font-bold text-rose-700 font-mono">
                              {conflict.waktuFormatted}
                            </span>
                          </div>
                          {conflict.dosen && conflict.dosen !== '-' && (
                            <div className="text-[11px] text-stone-600 pt-0.5">
                              <span className="font-semibold text-stone-500">Dosen:</span> {conflict.dosen}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-stone-100">
                {item.isAvailable ? (
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    icon={<PlusCircle className="w-4 h-4" />}
                    onClick={() =>
                      onOpenBookingModal(item.roomName, searchDate, searchStartTime, searchEndTime)
                    }
                  >
                    Pinjam Ruangan Ini
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    fullWidth
                    disabled
                  >
                    Tidak Dapat Dipinjam (Bentrok)
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
