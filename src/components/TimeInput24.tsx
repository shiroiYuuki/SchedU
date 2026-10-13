import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

export interface TimeInput24Props {
  value: string; // Format 'HH:mm', e.g. '08:00' or '13:30'
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  ariaLabel?: string;
}

// 24 jam lengkap dari 00 sampai 23
const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

// 60 menit lengkap dari 00 sampai 59
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

// Pilihan cepat jam kuliah umum di kampus
const QUICK_CLASS_TIMES = [
  '07:30',
  '08:00',
  '08:30',
  '09:40',
  '10:30',
  '11:20',
  '12:00',
  '13:00',
  '13:30',
  '14:00',
  '15:00',
  '15:30',
  '16:40',
  '17:00',
  '18:00',
  '19:00',
];

/**
 * Komponen Input Waktu 24 Jam (TimeInput24)
 * 
 * Fitur Utama:
 * 1. 100% Format 24 Jam konsisten (00:00 - 23:59) tanpa ketergantungan locale browser AM/PM.
 * 2. Pemilihan Jam (00-23) dan Menit (00-59) yang jelas dan ramah sentuhan (HP & PC).
 * 3. Nilai yang dikeluarkan selalu berformat baku 'HH:mm'.
 * 4. Mendukung pemilihan cepat (Quick Presets) jam perkuliahan umum.
 * 5. Desain profesional SchedU dengan dukungan Dark Mode & Light Mode.
 */
export const TimeInput24: React.FC<TimeInput24Props> = ({
  value,
  onChange,
  id,
  disabled = false,
  required = false,
  className = '',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsing jam dan menit dari nilai 'HH:mm'
  const parseTime = (val: string): { hour: string; minute: string } => {
    if (!val || !val.includes(':')) {
      return { hour: '08', minute: '00' };
    }
    const parts = val.split(':');
    const h = (parts[0] || '08').padStart(2, '0').slice(-2);
    const m = (parts[1] || '00').padStart(2, '0').slice(-2);
    const safeH = parseInt(h, 10) >= 0 && parseInt(h, 10) <= 23 ? h : '08';
    const safeM = parseInt(m, 10) >= 0 && parseInt(m, 10) <= 59 ? m : '00';
    return { hour: safeH, minute: safeM };
  };

  const { hour, minute } = parseTime(value);

  // Tutup dropdown jika klik di luar komponen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleHourChange = (newHour: string) => {
    const formattedHour = newHour.padStart(2, '0');
    onChange(`${formattedHour}:${minute}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    const formattedMinute = newMinute.padStart(2, '0');
    onChange(`${hour}:${formattedMinute}`);
  };

  const handleSelectQuickTime = (quickTime: string) => {
    onChange(quickTime);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Kontrol Utama Input Waktu 24 Jam */}
      <div
        className={`flex items-center justify-between w-full px-3 py-1.5 bg-stone-50 dark:bg-stone-800/80 border ${
          isOpen ? 'border-orange-500 ring-1 ring-orange-500' : 'border-stone-200 dark:border-stone-700'
        } rounded-lg text-stone-900 dark:text-stone-100 text-sm font-semibold transition-all min-h-[40px] ${
          disabled ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800/50' : ''
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Clock className="w-4 h-4 text-orange-500 shrink-0" />

          {/* Pemilih Jam 24 Jam (00 - 23) */}
          <div className="flex items-center bg-white dark:bg-stone-900/90 border border-stone-200/80 dark:border-stone-700/80 rounded-md px-1.5 py-0.5">
            <select
              id={id ? `${id}-hour` : undefined}
              value={hour}
              disabled={disabled}
              required={required}
              onChange={e => handleHourChange(e.target.value)}
              aria-label={`${ariaLabel || 'Jam Mulai / Selesai'} (Pilih Jam 00-23)`}
              className="bg-transparent text-stone-900 dark:text-stone-100 font-mono font-bold text-sm sm:text-base outline-none cursor-pointer py-1 px-1 rounded hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-center"
            >
              {HOURS_24.map(h => (
                <option key={h} value={h} className="dark:bg-stone-800 dark:text-stone-100 font-mono py-1">
                  {h}
                </option>
              ))}
            </select>

            <span className="font-mono font-bold text-stone-400 dark:text-stone-500 px-0.5 select-none">:</span>

            {/* Pemilih Menit (00 - 59) */}
            <select
              id={id ? `${id}-minute` : undefined}
              value={minute}
              disabled={disabled}
              required={required}
              onChange={e => handleMinuteChange(e.target.value)}
              aria-label={`${ariaLabel || 'Menit'} (Pilih Menit 00-59)`}
              className="bg-transparent text-stone-900 dark:text-stone-100 font-mono font-bold text-sm sm:text-base outline-none cursor-pointer py-1 px-1 rounded hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-center"
            >
              {MINUTES_60.map(m => (
                <option key={m} value={m} className="dark:bg-stone-800 dark:text-stone-100 font-mono py-1">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Indikator Baku 24 Jam & Tombol Buka Popover Pilihan Cepat */}
        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
          <span
            title="Sistem waktu beroperasi dalam format 24 jam (00:00 - 23:59)"
            className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-stone-200/80 dark:bg-stone-700/80 text-stone-700 dark:text-stone-300 select-none"
          >
            24H
          </span>

          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(!isOpen)}
            title="Buka pilihan jam cepat"
            aria-label="Buka pilihan jam cepat"
            className="p-1 rounded-lg text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200/70 dark:hover:bg-stone-700/70 transition-colors cursor-pointer"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Popover Pilihan Waktu Cepat (Format 24 Jam WITA) */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl p-3 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-100 dark:border-stone-800">
            <span className="font-bold text-stone-800 dark:text-stone-200 flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Pilihan Cepat Jam Kuliah</span>
            </span>
            <span className="text-[10px] font-mono text-stone-400 dark:text-stone-500 uppercase font-semibold">
              Format 24 Jam
            </span>
          </div>

          {/* Grid Tombol Waktu Populer */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {QUICK_CLASS_TIMES.map(t => {
              const isSelected = `${hour}:${minute}` === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSelectQuickTime(t)}
                  className={`px-2 py-1.5 rounded-lg font-mono font-bold text-xs text-center transition-colors cursor-pointer min-h-[32px] ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-stone-800/80 hover:bg-orange-100 dark:hover:bg-orange-950/60 hover:text-orange-700 dark:hover:text-orange-300 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Jam Siang & Sore (12-23) vs Pagi (00-11) bantuan visual */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
            <span>
              Waktu aktif: <strong className="font-mono text-orange-600 dark:text-orange-400">{hour}:{minute}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-orange-600 dark:hover:text-orange-400 px-2 py-1 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
