import React from 'react';

/**
 * Properti untuk komponen Button SchedU.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  // Pilihan varian tampilan tombol
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  // Pilihan ukuran tombol (disesuaikan agar nyaman disentuh di HP)
  size?: 'sm' | 'md' | 'lg';
  // Status loading jika tombol sedang memproses aksi
  isLoading?: boolean;
  // Ikon pendamping (opsional)
  icon?: React.ReactNode;
  // Posisi ikon: sebelah kiri atau kanan teks
  iconPosition?: 'left' | 'right';
  // Apakah tombol memenuhi lebar kontainer (full width)
  fullWidth?: boolean;
}

/**
 * Komponen Tombol Profesional SchedU
 *
 * Didesain minimalis, rapi, dan mudah diakses:
 * - Tidak menggunakan efek neon, glow, atau bayangan berlebihan.
 * - Warna oranye khas SchedU yang ramah di mata.
 * - Mendukung keyboard navigation via focus-visible ring.
 * - Mendukung otomatis Dark Mode & Light Mode.
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  // 1. Gaya dasar tombol (berlaku untuk semua varian)
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-colors duration-150 select-none cursor-pointer ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99]';

  // 2. Gaya berdasarkan varian warna (bersih, profesional, bebas glow/neon)
  const variantStyles = {
    // Tombol Utama (Aksi terpenting, oranye khas SchedU tanpa glow berlebihan)
    primary:
      'bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white border border-transparent ' +
      'focus-visible:ring-orange-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-stone-900',

    // Tombol Sekunder (Aksi pelengkap netral)
    secondary:
      'bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 ' +
      'dark:bg-stone-800 dark:hover:bg-stone-700 dark:active:bg-stone-600 dark:text-stone-100 ' +
      'border border-stone-200 dark:border-stone-700 focus-visible:ring-stone-400',

    // Tombol Garis Tepi (Outline)
    outline:
      'bg-transparent hover:bg-stone-100 active:bg-stone-200 text-stone-700 ' +
      'dark:hover:bg-stone-800 dark:active:bg-stone-700 dark:text-stone-300 ' +
      'border border-stone-300 dark:border-stone-700 focus-visible:ring-orange-500',

    // Tombol Polos (Ghost)
    ghost:
      'bg-transparent hover:bg-stone-100 active:bg-stone-200 text-stone-700 ' +
      'dark:hover:bg-stone-800 dark:active:bg-stone-700 dark:text-stone-300 ' +
      'border border-transparent focus-visible:ring-orange-500',

    // Tombol Peringatan / Batal (Danger)
    danger:
      'bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 ' +
      'dark:bg-rose-950/50 dark:hover:bg-rose-900/60 dark:text-rose-300 ' +
      'border border-rose-200 dark:border-rose-900/60 focus-visible:ring-rose-500',
  };

  // 3. Ukuran tombol (dengan rasio padding horizontal ~2x vertikal dan tinggi nyaman)
  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-lg min-h-[36px] gap-1.5',
    md: 'text-xs sm:text-sm px-4 py-2 rounded-lg min-h-[40px] gap-2',
    lg: 'text-sm sm:text-base px-5 py-2.5 rounded-lg min-h-[44px] gap-2.5',
  };

  // 4. Pengaturan lebar tombol
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      {...props}
    >
      {/* Spinner animasi jika sedang loading */}
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4 shrink-0"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Ikon di sebelah kiri teks */}
      {!isLoading && icon && iconPosition === 'left' && (
        <span className="shrink-0">{icon}</span>
      )}

      {/* Konten teks tombol */}
      <span>{children}</span>

      {/* Ikon di sebelah kanan teks */}
      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0">{icon}</span>
      )}
    </button>
  );
};
