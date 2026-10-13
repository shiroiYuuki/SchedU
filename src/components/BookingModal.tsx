import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { ScheduleItem, BookingItem } from '../types';
import {
  extractUniqueRooms,
  checkRoomAvailability,
  formatIndonesianDate,
  timeToMinutes,
  getTodayDateString,
} from '../utils/timeConflict';
import { reservationService } from '../services/reservationService';
import { Button } from './Button';
import { TimeInput24 } from './TimeInput24';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRoom?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  schedules: ScheduleItem[];
  bookings: BookingItem[];
  user?: any | null;
  onOpenAuth?: () => void;
  onBookingSuccess: (newBooking: BookingItem) => void;
  isDbConnected: boolean;
  onOpenDbConfig?: () => void;
}

/**
 * Modal Formulir Booking Ruangan SchedU (Anti-AI-Slop & Premium Design)
 *
 * Menerapkan:
 * 1. Clean Surface Header: Menghilangkan banner gradien oranye mencolok, menggunakan permukaan netral berkelas.
 * 2. Zero-Pill & Metadata Discipline: Status ketersediaan unboxed dengan teks dan ikon yang jelas.
 * 3. Whitespace Over Cards Within Cards: Ringkasan konfirmasi berupa structured grid dengan hairline dividers.
 */
export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  initialRoom,
  initialDate,
  initialStartTime,
  initialEndTime,
  schedules,
  bookings,
  onBookingSuccess,
}) => {
  const [namaPeminjam, setNamaPeminjam] = useState('');
  const [nim, setNim] = useState('');
  const [ruangan, setRuangan] = useState(initialRoom || '');
  const [tanggal, setTanggal] = useState(initialDate || getTodayDateString());
  const [jamMulai, setJamMulai] = useState(initialStartTime || '09:00');
  const [jamSelesai, setJamSelesai] = useState(initialEndTime || '11:00');
  const [keperluan, setKeperluan] = useState('');

  const [step, setStep] = useState<'input' | 'confirm' | 'submitting'>('input');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sinkronisasi props awal ketika modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (initialRoom) setRuangan(initialRoom);
      if (initialDate) setTanggal(initialDate);
      if (initialStartTime) setJamMulai(initialStartTime);
      if (initialEndTime) setJamSelesai(initialEndTime);
      setStep('input');
      setErrorMessage(null);
    }
  }, [isOpen, initialRoom, initialDate, initialStartTime, initialEndTime]);

  const allRooms = useMemo(() => {
    return extractUniqueRooms(schedules, bookings);
  }, [schedules, bookings]);

  // Set ruangan default jika belum dipilih
  useEffect(() => {
    if (!ruangan && allRooms.length > 0) {
      setRuangan(allRooms[0]);
    }
  }, [allRooms, ruangan]);

  // Pemeriksaan ketersediaan real-time
  const conflictCheck = useMemo(() => {
    if (!ruangan || !tanggal || !jamMulai || !jamSelesai) {
      return { isAvailable: false, conflicts: [], isValidTime: false };
    }

    const isValid = timeToMinutes(jamSelesai) > timeToMinutes(jamMulai);
    if (!isValid) {
      return { isAvailable: false, conflicts: [], isValidTime: false };
    }

    const res = checkRoomAvailability(ruangan, tanggal, jamMulai, jamSelesai, schedules, bookings);
    return {
      isAvailable: res.isAvailable,
      conflicts: res.conflicts,
      isValidTime: true,
    };
  }, [ruangan, tanggal, jamMulai, jamSelesai, schedules, bookings]);

  if (!isOpen) return null;

  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!namaPeminjam.trim()) {
      setErrorMessage('Nama mahasiswa / peminjam wajib diisi.');
      return;
    }

    if (!nim.trim()) {
      setErrorMessage('Nomor Induk Mahasiswa (NIM) wajib diisi.');
      return;
    }

    if (!ruangan) {
      setErrorMessage('Silakan pilih ruangan yang ingin dipinjam.');
      return;
    }

    if (!tanggal) {
      setErrorMessage('Tanggal peminjaman wajib dipilih.');
      return;
    }

    if (!conflictCheck.isValidTime) {
      setErrorMessage('Jam selesai harus lebih akhir daripada jam mulai.');
      return;
    }

    if (!keperluan.trim()) {
      setErrorMessage('Tujuan / keperluan peminjaman ruangan wajib diisi.');
      return;
    }

    if (!conflictCheck.isAvailable) {
      setErrorMessage(
        'Ruangan tidak tersedia pada jam tersebut karena bentrok dengan perkuliahan atau peminjaman lain.'
      );
      return;
    }

    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setStep('submitting');
    setErrorMessage(null);

    try {
      const result = await reservationService.createBooking({
        nama_peminjam: namaPeminjam.trim(),
        nim: nim.trim(),
        ruangan: ruangan.trim(),
        tanggal,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        keperluan: keperluan.trim(),
      });

      if (result.success && result.data) {
        onBookingSuccess(result.data);
        onClose();
      } else {
        setStep('confirm');
        setErrorMessage(result.error || 'Gagal menyimpan peminjaman ke sistem.');
      }
    } catch (err: any) {
      setStep('confirm');
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses peminjaman.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden my-8 transition-colors">
        {/* Header Bersih dan Berkelas (Bebas dari gradien mencolok) */}
        <div className="px-6 py-4 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-stone-100 dark:bg-stone-800 text-orange-600 dark:text-orange-400">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                {step === 'confirm' ? 'Konfirmasi Peminjaman' : 'Formulir Booking Ruangan'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {step === 'confirm' ? 'Periksa kembali rincian sebelum disimpan' : 'Lengkapi data peminjaman di bawah ini'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors cursor-pointer"
            aria-label="Tutup modal booking"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifikasi Error */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Step 1: Input Form */}
        {step === 'input' && (
          <form onSubmit={handleProceedToConfirmation} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Nama Mahasiswa / Peminjam *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap peminjam"
                    value={namaPeminjam}
                    onChange={e => setNamaPeminjam(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Nomor Induk Mahasiswa (NIM) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 2110512048"
                  value={nim}
                  onChange={e => setNim(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Pilih Ruangan *
                </label>
                <select
                  required
                  value={ruangan}
                  onChange={e => setRuangan(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer min-h-[38px]"
                >
                  {allRooms.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Tanggal Peminjaman *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={e => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 cursor-pointer min-h-[38px]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Jam Mulai (24 Jam) *
                </label>
                <TimeInput24
                  id="modal-jam-mulai"
                  value={jamMulai}
                  onChange={setJamMulai}
                  ariaLabel="Jam Mulai Booking"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Jam Selesai (24 Jam) *
                </label>
                <TimeInput24
                  id="modal-jam-selesai"
                  value={jamSelesai}
                  onChange={setJamSelesai}
                  ariaLabel="Jam Selesai Booking"
                />
              </div>
            </div>

            {/* Status Ketersediaan Real-time Unboxed */}
            <div className="pt-1">
              {!conflictCheck.isValidTime ? (
                <div className="p-3 bg-stone-100 dark:bg-stone-800/60 rounded-lg text-xs text-stone-600 dark:text-stone-400 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  <span>Jam selesai harus lebih akhir daripada jam mulai.</span>
                </div>
              ) : conflictCheck.isAvailable ? (
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Ruangan <strong className="font-semibold">{ruangan}</strong> siap dan kosong pada waktu tersebut.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 rounded-lg text-xs text-rose-800 dark:text-rose-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Ruangan bentrok dengan aktivitas perkuliahan / booking lain:</span>
                  </div>
                  <ul className="pl-5 list-disc space-y-0.5 text-[11px] text-rose-700 dark:text-rose-300">
                    {conflictCheck.conflicts.map((c, idx) => (
                      <li key={idx}>
                        {c.mataKuliah} ({c.waktuFormatted})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                Keperluan / Tujuan Pemakaian *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Contoh: Rapat Himpunan Mahasiswa, Latihan Presentasi Sidang, dsb."
                value={keperluan}
                onChange={e => setKeperluan(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-medium text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200/80 dark:border-stone-800">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={!conflictCheck.isAvailable || !conflictCheck.isValidTime}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Lanjutkan Konfirmasi
              </Button>
            </div>
          </form>
        )}

        {/* Step 2: Confirmation Screen (Whitespace over cards-within-cards) */}
        {step !== 'input' && (
          <div className="p-6 space-y-4">
            <div className="border border-stone-200 dark:border-stone-800 rounded-lg divide-y divide-stone-100 dark:divide-stone-800 text-xs">
              <div className="flex items-center justify-between p-3">
                <span className="text-stone-500 dark:text-stone-400">Peminjam</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{namaPeminjam}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-stone-500 dark:text-stone-400">NIM</span>
                <span className="font-mono tabular-nums font-semibold text-stone-900 dark:text-stone-100">{nim}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-stone-500 dark:text-stone-400">Ruangan</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{ruangan}</span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-stone-500 dark:text-stone-400">Waktu Pelaksanaan</span>
                <span className="font-mono tabular-nums font-semibold text-stone-900 dark:text-stone-100">
                  {jamMulai}–{jamSelesai} WITA
                </span>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="text-stone-500 dark:text-stone-400">Tanggal</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {formatIndonesianDate(tanggal)}
                </span>
              </div>
              <div className="p-3">
                <span className="text-stone-500 dark:text-stone-400 block mb-1">Keperluan</span>
                <p className="text-stone-800 dark:text-stone-200 leading-relaxed">
                  {keperluan}
                </p>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
              Dengan mengonfirmasi, jadwal peminjaman ruangan ini akan tercatat dalam sistem dan otomatis terintegrasi untuk mencegah bentrok jadwal.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200/80 dark:border-stone-800">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={step === 'submitting'}
                onClick={() => setStep('input')}
              >
                Ubah Data
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={step === 'submitting'}
                disabled={step === 'submitting'}
                onClick={handleFinalSubmit}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {step === 'submitting' ? 'Menyimpan…' : 'Konfirmasi & Ajukan'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
