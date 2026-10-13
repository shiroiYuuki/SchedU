import React, { useState } from 'react';
import { X, Clock, Calendar, Building2, User, BookOpen, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { ScheduleItem } from '../types';
import { Button } from './Button';
import { scheduleChangeServiceArchitecture } from '../utils/academicSchedule';

interface ScheduleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSchedule: ScheduleItem | null;
}

export const ScheduleChangeModal: React.FC<ScheduleChangeModalProps> = ({
  isOpen,
  onClose,
  selectedSchedule,
}) => {
  const [proposedDay, setProposedDay] = useState<string>('Senin');
  const [proposedStartTime, setProposedStartTime] = useState<string>('08:00');
  const [proposedEndTime, setProposedEndTime] = useState<string>('09:40');
  const [proposedRoom, setProposedRoom] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-change-modal-title"
    >
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl max-w-xl w-full p-5 sm:p-6 my-8 space-y-5 transition-colors">
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-200/80 dark:border-stone-800 pb-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 text-[11px] font-semibold">
              <Lock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span>Arsitektur Fitur Mendatang · Read-Only Safeguard</span>
            </div>
            <h2
              id="schedule-change-modal-title"
              className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white tracking-tight"
            >
              Usulan Perubahan Jadwal Terverifikasi Admin
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Tata kelola terstruktur untuk pengajuan revisi ruang/jam perkuliahan dengan persetujuan akademik.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informasi Jadwal Saat Ini */}
        {selectedSchedule && (
          <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-800 rounded-xl p-4 space-y-2 text-xs">
            <div className="font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-orange-500" />
              <span>Jadwal Aktif yang Dipilih:</span>
            </div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {selectedSchedule.Mata_Kuliah} ({selectedSchedule.Kode_Mata_Kuliah})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">
              <div>
                <span className="block text-[10px] text-stone-400 font-sans uppercase">Kelas</span>
                <strong className="text-stone-900 dark:text-stone-100">{selectedSchedule.Kelas}</strong>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 font-sans uppercase">Hari</span>
                <strong className="text-stone-900 dark:text-stone-100">{selectedSchedule.Hari}</strong>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 font-sans uppercase">Jam</span>
                <strong className="text-stone-900 dark:text-stone-100">{selectedSchedule.Mulai} - {selectedSchedule.Selesai}</strong>
              </div>
              <div>
                <span className="block text-[10px] text-stone-400 font-sans uppercase">Ruangan</span>
                <strong className="text-stone-900 dark:text-stone-100">{selectedSchedule.Ruangan}</strong>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              <span>Dosen: {selectedSchedule.Dosen}</span>
            </div>
          </div>
        )}

        {/* Workflow Pipeline Tata Kelola Akademik */}
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Alur Tata Kelola Perubahan Jadwal (Admin-Approved Workflow):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {scheduleChangeServiceArchitecture.futureWorkflowSteps.map(item => (
              <div
                key={item.step}
                className="bg-white dark:bg-stone-800/80 p-3 rounded-lg border border-stone-200/80 dark:border-stone-700/80 flex items-start gap-2.5"
              >
                <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold text-stone-900 dark:text-stone-100 text-[11px]">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Simulasi Usulan (Disabled State) */}
        <div className="bg-stone-50/70 dark:bg-stone-800/40 border border-stone-200/80 dark:border-stone-800 rounded-xl p-4 space-y-3 opacity-90">
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center justify-between">
            <span>Pratinjau Formulir Pengajuan Perubahan:</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
              Fitur Masa Depan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Usulan Hari Baru
              </label>
              <select
                disabled
                value={proposedDay}
                onChange={e => setProposedDay(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-500 cursor-not-allowed"
              >
                {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Jam Mulai - Selesai
              </label>
              <input
                type="text"
                disabled
                value={`${proposedStartTime} - ${proposedEndTime} WITA`}
                className="w-full px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
                Usulan Ruangan Baru
              </label>
              <input
                type="text"
                disabled
                placeholder="Pilih Ruangan Kosong"
                value={proposedRoom}
                className="w-full px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-stone-600 dark:text-stone-400 mb-1">
              Alasan Akademik Pengajuan
            </label>
            <input
              type="text"
              disabled
              placeholder="Contoh: Penyesuaian jadwal praktikum atau bentrok kegiatan seminar akademik"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-500 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Pemberitahuan Keamanan Read-Only */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-[11px]">
              Penulisan langsung (Write-Back) ke Google Sheets saat ini dinonaktifkan.
            </p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              Seluruh data jadwal perkuliahan jurusan bersumber langsung dari Google Sheets resmi secara read-only.
              Fitur mutasi jadwal akan diaktifkan setelah portal verifikasi tanda tangan digital Ketua Jurusan selesai dikonfigurasi.
            </p>
          </div>
        </div>

        {/* Footer Tombol */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200/80 dark:border-stone-800">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-500 cursor-not-allowed flex items-center gap-1.5"
            title="Fitur ini dinonaktifkan pada tahap arsitektur saat ini"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Kirim Usulan (Segera Hadir)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
