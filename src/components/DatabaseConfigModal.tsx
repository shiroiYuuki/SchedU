import React, { useState } from 'react';
import { X, Database, Check, Copy, AlertTriangle, CheckCircle2, FileSpreadsheet, Code2, Globe, RefreshCw, ExternalLink } from 'lucide-react';
import { SUPABASE_SETUP_SQL } from '../services/databaseSql';
import { getSupabaseCredentials, saveSupabaseCredentials, checkSupabaseConnection } from '../services/supabaseClient';
import { GOOGLE_SHEETS_CSV_URL } from '../config/dataSource';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'sheets' | 'supabase' | 'sql' | 'github'>('sheets');

  // Supabase states
  const initialCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(initialCreds.url);
  const [supabaseKey, setSupabaseKey] = useState(initialCreds.key);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Copy state
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleSaveSupabase = async () => {
    saveSupabaseCredentials(supabaseUrl, supabaseKey);
    setIsTesting(true);
    setTestResult(null);

    const res = await checkSupabaseConnection();
    setIsTesting(false);
    setTestResult(res);

    onConfigUpdated();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-stone-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-orange-500 rounded-lg text-white font-bold text-xs">
              schedU
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Informasi Sumber Data & Database</h3>
              <p className="text-xs text-stone-400">Google Sheets CSV (Default), Supabase, dan Skrip SQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-stone-200 bg-stone-50 px-6 pt-3 space-x-2 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Google Sheets (Aktif)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('supabase')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'supabase'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Database Supabase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sql')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'sql'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>Skrip SQL & RLS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'github'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Deployment</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: GOOGLE SHEETS CSV */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Google Sheets Terhubung Otomatis Sebagai Sumber Utama</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Seluruh data jadwal perkuliahan, nama ruangan, kelas, mata kuliah, dan waktu (WITA) otomatis dimuat langsung dari URL CSV Google Sheets resmi jurusan.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  URL CSV Google Sheets Resmi
                </label>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-800 break-all select-all">
                  {GOOGLE_SHEETS_CSV_URL}
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  *Tersimpan di konfigurasi proyek sebagai satu-satunya sumber jadwal default.
                </span>
              </div>

              <div className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl text-xs text-stone-700 space-y-2">
                <div className="font-bold text-stone-900">Ketentuan Sumber Data:</div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-stone-600">
                  <li>Kolom CSV dipetakan berdasarkan header: <code>Hari</code>, <code>Kelas</code>, <code>Kode_Mata_Kuliah</code>, <code>Mata_Kuliah</code>, <code>Mulai</code>, <code>Selesai</code>, <code>Ruangan</code>, <code>Dosen</code>.</li>
                  <li>Nama ruangan ditampilkan persis sama dengan nilai asli dari kolom <code>Ruangan</code> (misal: <code>FST.1.1</code>, <code>LAB-INT.Internet 1</code>, <code>FST.3.5</code>).</li>
                  <li>Waktu kegiatan diinterpretasikan dalam zona waktu <strong>WITA (Asia/Makassar)</strong>.</li>
                  <li>Pembaruan jadwal di Google Sheets akan otomatis terbaca oleh website setiap kali halaman dibuka atau pengguna menekan tombol refresh.</li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onConfigUpdated();
                    onClose();
                  }}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Tutup & Muat Ulang
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE */}
          {activeTab === 'supabase' && (
            <div className="space-y-4">
              <div className="text-xs text-stone-600 leading-relaxed">
                Supabase disiapkan untuk tahap peminjaman multi-pengguna dengan penyimpanan real-time dan aturan Row Level Security (RLS).
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={e => setSupabaseUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Supabase Anon (Publishable) Key
                </label>
                <input
                  type="text"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={e => setSupabaseKey(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-stone-900 outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    setIsTesting(true);
                    setTestResult(null);
                    const res = await checkSupabaseConnection();
                    setIsTesting(false);
                    setTestResult(res);
                  }}
                  disabled={isTesting || !supabaseUrl || !supabaseKey}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isTesting ? 'Menguji...' : 'Uji Koneksi'}
                </button>

                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Simpan & Hubungkan
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: SQL */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-stone-900">Skrip Database PostgreSQL (Supabase)</h4>
                  <p className="text-xs text-stone-600">
                    Tabel peminjaman, aturan RLS, dan fungsi trigger pencegahan bentrok ganda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Skrip SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-stone-900 text-stone-200 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-72 border border-stone-800 leading-relaxed">
                <pre>{SUPABASE_SETUP_SQL}</pre>
              </div>
            </div>
          )}

          {/* TAB 4: GITHUB PAGES */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-900">Panduan Publikasi ke GitHub Pages</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                schedU siap di-build sebagai static site dan di-hosting gratis di GitHub Pages.
              </p>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-2.5 text-xs text-stone-700">
                <p><strong>1. Build Proyek:</strong></p>
                <pre className="bg-stone-900 text-stone-100 p-2.5 rounded-lg font-mono">npm run build</pre>
                <p><strong>2. Deploy folder dist/:</strong></p>
                <pre className="bg-stone-900 text-stone-100 p-2.5 rounded-lg font-mono">npx gh-pages -d dist</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
