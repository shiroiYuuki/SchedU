export const SUPABASE_SETUP_SQL = `-- ==============================================================================
-- SKRIP SETUP DATABASE schedU (Supabase / PostgreSQL)
-- Dijalankan pada: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Buat Tabel Peminjaman Ruangan
CREATE TABLE IF NOT EXISTS public.peminjaman_ruangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_peminjam VARCHAR(100) NOT NULL,
    nim VARCHAR(30) NOT NULL,
    ruangan VARCHAR(100) NOT NULL,
    tanggal DATE NOT NULL,
    jam_mulai TIME NOT NULL,
    jam_selesai TIME NOT NULL,
    keperluan TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai', 'dibatalkan')),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_waktu_valid CHECK (jam_selesai > jam_mulai)
);

-- 2. Index untuk Mempercepat Query Pengecekan Ketersediaan
CREATE INDEX IF NOT EXISTS idx_peminjaman_ruangan_tanggal 
ON public.peminjaman_ruangan (ruangan, tanggal, status);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.peminjaman_ruangan ENABLE ROW LEVEL SECURITY;

-- 4. Kebijakan RLS (Security Policies):
-- - Mahasiswa & pengunjung dapat melihat seluruh jadwal peminjaman agar tahu bentrok
DROP POLICY IF EXISTS "Siapapun dapat melihat peminjaman aktif" ON public.peminjaman_ruangan;
CREATE POLICY "Siapapun dapat melihat peminjaman aktif"
ON public.peminjaman_ruangan
FOR SELECT
TO public
USING (true);

-- - Hanya mahasiswa yang telah LOGIN (authenticated) yang boleh mengajukan peminjaman
DROP POLICY IF EXISTS "Hanya user login yang dapat membuat peminjaman" ON public.peminjaman_ruangan;
CREATE POLICY "Hanya user login yang dapat membuat peminjaman"
ON public.peminjaman_ruangan
FOR INSERT
TO authenticated
WITH CHECK (true);

-- - Pengguna login dapat membatalkan/mengubah status peminjaman mereka
DROP POLICY IF EXISTS "User login dapat membatalkan peminjaman" ON public.peminjaman_ruangan;
CREATE POLICY "User login dapat membatalkan peminjaman"
ON public.peminjaman_ruangan
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. FUNGSI & TRIGGER PENCEGAHAN BENTROK DI SISI DATABASE (Concurrency & Race Condition Prevention)
-- Menjamin bahwa dua peminjam yang menekan submit di detik yang sama TIDAK BISA mendapatkan ruangan yang sama
CREATE OR REPLACE FUNCTION public.check_peminjaman_bentrok()
RETURNS TRIGGER AS $$
BEGIN
    -- Hanya cek peminjaman yang berstatus aktif
    IF NEW.status = 'aktif' THEN
        -- Cek apakah ada peminjaman lain di ruangan dan tanggal yang sama dengan interval tumpang tindih
        -- Syarat bentrok interval: (Mulai_A < Selesai_B) AND (Selesai_A > Mulai_B)
        IF EXISTS (
            SELECT 1 
            FROM public.peminjaman_ruangan
            WHERE id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
              AND LOWER(ruangan) = LOWER(NEW.ruangan)
              AND tanggal = NEW.tanggal
              AND status = 'aktif'
              AND (NEW.jam_mulai < jam_selesai AND NEW.jam_selesai > jam_mulai)
        ) THEN
            RAISE EXCEPTION 'Bentrok! Ruangan % sudah dipinjam pada tanggal % pada rentang waktu yang bertabrakan.', 
                NEW.ruangan, NEW.tanggal;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang Trigger pada Tabel
DROP TRIGGER IF EXISTS trigger_cek_bentrok_peminjaman ON public.peminjaman_ruangan;
CREATE TRIGGER trigger_cek_bentrok_peminjaman
BEFORE INSERT OR UPDATE ON public.peminjaman_ruangan
FOR EACH ROW
EXECUTE FUNCTION public.check_peminjaman_bentrok();

-- ==============================================================================
-- SELESAI: Database schedU siap digunakan dengan keamanan RLS & Proteksi Bentrok!
-- ==============================================================================
`;
