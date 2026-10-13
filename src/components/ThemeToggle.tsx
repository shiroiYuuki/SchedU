import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sun, Moon, Monitor, ChevronDown, Check } from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';

interface ThemeToggleProps {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

interface ThemeOption {
  id: ThemeMode;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

/**
 * Komponen Pengganti Tema (ThemeToggle) SchedU
 *
 * Mengakomodasi:
 * 1. Deteksi dinamis arah dropdown (Drop-Up otomatis jika berada di pojok bawah layar).
 * 2. Menghindari dropdown terpotong tepi layar dengan menghitung ruang viewport.
 * 3. Scroll internal responsif (`max-height` dinamis dan `overflow-y-auto`) agar semua opsi dapat dijangkau.
 * 4. Animasi dan transisi halus, rotasi indikator chevron.
 * 5. Aksesibilitas keyboard (Escape untuk menutup, navigasi panah, aria-expanded).
 * 6. Dukungan klik/sentuh mobile (mousedown dan touchstart).
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, setTheme, isDark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [maxHeightStyle, setMaxHeightStyle] = useState<number>(240);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const options: ThemeOption[] = [
    {
      id: 'system',
      label: 'Sistem',
      desc: 'Ikuti preferensi OS perangkat',
      icon: <Monitor className="w-4 h-4 text-stone-500 dark:text-stone-400 shrink-0" />,
    },
    {
      id: 'light',
      label: 'Terang',
      desc: 'Tampilan lembut & nyaman di mata',
      icon: <Sun className="w-4 h-4 text-amber-500 shrink-0" />,
    },
    {
      id: 'dark',
      label: 'Gelap',
      desc: 'Kontras teduh hemat daya',
      icon: <Moon className="w-4 h-4 text-indigo-400 shrink-0" />,
    },
  ];

  // Hitung ruang viewport untuk menentukan apakah harus membuka ke atas (drop-up) atau ke bawah (drop-down)
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Perkiraan tinggi menu lengkap (~170px) ditambah jarak aman
    const estimatedMenuHeight = 175;

    // Jika ruang di bawah kurang dari perkiraan dan ruang di atas lebih leluasa, gunakan drop-up
    if (spaceBelow < estimatedMenuHeight && spaceAbove >= spaceBelow) {
      setDirection('up');
      // Batasi tinggi maksimal agar tidak keluar dari batas atas layar (margin 12px)
      const availableHeight = Math.max(120, Math.min(280, spaceAbove - 16));
      setMaxHeightStyle(availableHeight);
    } else {
      setDirection('down');
      // Batasi tinggi maksimal agar tidak keluar dari batas bawah layar (margin 12px)
      const availableHeight = Math.max(120, Math.min(280, spaceBelow - 16));
      setMaxHeightStyle(availableHeight);
    }
  }, []);

  // Update posisi saat dropdown dibuka atau ukuran layar berubah
  useEffect(() => {
    if (isOpen) {
      calculatePosition();

      // Tambahkan listener resize & scroll untuk memastikan menu tetap dalam viewport jika layar digulir/diubah
      const handleResizeOrScroll = () => {
        calculatePosition();
      };

      window.addEventListener('resize', handleResizeOrScroll, { passive: true });
      window.addEventListener('scroll', handleResizeOrScroll, { passive: true });

      return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll);
      };
    }
  }, [isOpen, calculatePosition]);

  // Tutup dropdown jika pengguna mengklik atau menyentuh di luar area menu
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerOutside);
    document.addEventListener('touchstart', handlePointerOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerOutside);
      document.removeEventListener('touchstart', handlePointerOutside);
    };
  }, [isOpen]);

  // Navigasi keyboard dan tombol Escape
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev < options.length - 1 ? prev + 1 : 0;
          optionRefs.current[next]?.focus();
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev > 0 ? prev - 1 : options.length - 1;
          optionRefs.current[next]?.focus();
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, options.length]);

  const toggleDropdown = () => {
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (id: ThemeMode) => {
    setTheme(id);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  // Label tema yang sedang aktif
  const currentLabel =
    theme === 'system' ? 'Sistem' : theme === 'light' ? 'Terang' : 'Gelap';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Tombol Pemicu Dropdown “Ubah Theme” */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        title="Ubah Tema Tampilan (Terang / Gelap / Sistem)"
        aria-label={`Ubah Tema Tampilan (Saat ini: ${currentLabel})`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center space-x-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-700/80 hover:border-orange-300 dark:hover:border-orange-500/50 transition-all text-xs font-semibold cursor-pointer min-h-[38px] shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      >
        {/* Tampilkan ikon sesuai tema aktif saat ini */}
        {isDark ? (
          <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
        )}
        <span className="capitalize font-medium select-none">{currentLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-stone-400 dark:text-stone-400 shrink-0 ml-0.5 transition-transform duration-200 ${
            isOpen
              ? direction === 'up'
                ? '-rotate-180 text-orange-500'
                : 'rotate-180 text-orange-500'
              : 'rotate-0'
          }`}
        />
      </button>

      {/* Menu Pilihan Dropdown / Drop-up */}
      {isOpen && (
        <div
          ref={menuRef}
          role="listbox"
          aria-label="Pilihan Tema Tampilan"
          style={{ maxHeight: `${maxHeightStyle}px` }}
          className={`absolute right-0 w-52 sm:w-56 bg-white dark:bg-stone-800 rounded-2xl shadow-xl border border-stone-200 dark:border-stone-700 py-1.5 z-50 overflow-y-auto overscroll-contain custom-scrollbar ${
            direction === 'up'
              ? 'bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2 duration-150 origin-bottom-right'
              : 'top-full mt-2 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right'
          }`}
        >
          {/* Header kecil dalam menu */}
          <div className="px-3.5 py-1.5 border-b border-stone-100 dark:border-stone-700/70 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Pilih Tema
            </span>
            <span className="text-[10px] font-mono text-orange-600 dark:text-orange-400 font-semibold">
              SchedU
            </span>
          </div>

          {/* Daftar Opsi Tema */}
          <div className="p-1 space-y-1">
            {options.map((opt, index) => {
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  ref={el => {
                    optionRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold border border-orange-200/80 dark:border-orange-800/60 shadow-2xs'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-1">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-orange-100 dark:bg-orange-900/50'
                          : 'bg-stone-100 dark:bg-stone-700/70'
                      }`}
                    >
                      {opt.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold leading-tight truncate">
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 font-normal leading-tight truncate mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white ml-2 shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
