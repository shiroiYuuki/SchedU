import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, LogIn, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient } from '../services/supabaseClient';
import { Button } from './Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  onOpenDbConfig: () => void;
  isDbConnected: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenDbConfig,
  isDbConnected,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const client = getSupabaseClient();
    if (!client) {
      setErrorMessage(
        'Supabase belum dihubungkan. Silakan masukkan Supabase Project URL dan Anon Key terlebih dahulu di menu Pengaturan Database.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMessage(`Gagal masuk: ${error.message}. Periksa kembali email dan kata sandi akun jurusan.`);
      } else if (data?.user) {
        onLoginSuccess(data.user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(`Terjadi kesalahan sistem: ${err.message || 'Koneksi gagal'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-orange-200" />
            <h3 className="font-extrabold text-lg">Masuk Akun Mahasiswa schedU</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Warning if not connected */}
        {!isDbConnected && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Supabase Belum Dihubungkan</span>
              </span>
              <button
                type="button"
                onClick={onOpenDbConfig}
                className="underline text-amber-900 hover:text-orange-600"
              >
                Konfigurasi
              </button>
            </div>
            <p className="text-[11px] text-amber-700">
              Autentikasi dikelola langsung oleh Supabase Auth. Harap masukkan Project URL & Anon Key di pengaturan agar sesi login dapat diverifikasi.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Email Akun Mahasiswa Jurusan
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="mahasiswa@jurusan.ac.id"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Kata Sandi Bersama (Shared Password)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 outline-none focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
          </div>

          {/* Transparent Notice about Shared Password Limitations */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-600 space-y-1">
            <div className="font-bold text-stone-800 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>Informasi Keamanan Akun Jurusan:</span>
            </div>
            <p className="leading-relaxed">
              Website ini menggunakan Supabase Auth dengan akun mahasiswa bersama. Karena menggunakan satu akun bersama, sistem memvalidasi sesi secara kriptografis melalui JWT Supabase, namun identitas spesifik mahasiswa diverifikasi melalui <strong>Nama & NIM</strong> yang diisi pada formulir peminjaman.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={loading}
              disabled={loading}
              icon={<LogIn className="w-4 h-4" />}
            >
              {loading ? 'Memverifikasi Sesi...' : 'Masuk Sekarang'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
