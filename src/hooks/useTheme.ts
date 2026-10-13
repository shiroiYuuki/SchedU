import { useState, useEffect, useCallback } from 'react';

/**
 * Tipe pilihan tema yang didukung:
 * - 'system': Mengikuti setelan mode gelap/terang di sistem operasi perangkat pengguna secara dinamis.
 * - 'light' : Memaksa tampilan selalu menggunakan mode terang.
 * - 'dark'  : Memaksa tampilan selalu menggunakan mode gelap.
 */
export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'schedu_theme_preference';

/**
 * Hook custom untuk mengelola tema (Dark Mode & Light Mode).
 *
 * Cara kerja:
 * 1. Memeriksa apakah pengguna pernah menyimpan preferensi tema di localStorage.
 * 2. Jika belum ada atau jika memilih 'system', tema akan membaca window.matchMedia('(prefers-color-scheme: dark)').
 * 3. Menambahkan atau menghapus class 'dark' pada elemen <html> (document.documentElement).
 * 4. Mendengarkan perubahan tema di tingkat OS secara real-time saat mode 'system' aktif.
 */
export function useTheme() {
  // Baca preferensi tersimpan, default ke 'system' jika belum pernah disetel
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'system';
  });

  // State boolean untuk mengetahui apakah saat ini tampilan sedang dalam mode gelap
  const [isDark, setIsDark] = useState<boolean>(false);

  /**
   * Fungsi untuk menerapkan class 'dark' ke elemen <html>
   * berdasarkan pilihan tema pengguna dan preferensi OS.
   */
  const applyTheme = useCallback((currentTheme: ThemeMode) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let shouldBeDark = false;
    if (currentTheme === 'dark') {
      shouldBeDark = true;
    } else if (currentTheme === 'light') {
      shouldBeDark = false;
    } else {
      // Mode 'system': mengikuti preferensi perangkat
      shouldBeDark = systemPrefersDark;
    }

    if (shouldBeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    setIsDark(shouldBeDark);
  }, []);

  // Terapkan tema saat komponen pertama kali dimuat atau saat state 'theme' berubah
  useEffect(() => {
    applyTheme(theme);

    // Simpan ke localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme, applyTheme]);

  // Dengarkan perubahan tema dari OS jika mode yang dipilih adalah 'system'
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Handler yang dipanggil saat pengguna mengubah tema di pengaturan OS mereka
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  /**
   * Fungsi publik untuk mengubah preferensi tema.
   */
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return {
    theme,
    setTheme,
    isDark,
  };
}
