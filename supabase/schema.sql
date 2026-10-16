-- ==============================================================================
-- SCHEDU — UNIVERSITAS CLASSROOM AVAILABILITY & BOOKING SYSTEM
-- INITIAL DATABASE SCHEMA & ROW LEVEL SECURITY (RLS) FOUNDATION
-- ==============================================================================
-- File: supabase/schema.sql
-- PostgreSQL Version: 15+ (Compatible with Supabase PostgreSQL)
-- Security Standard: Zero-Trust RLS, btree_gist Exclusion Overlap Locking
-- ==============================================================================

-- 1. EXTENSIONS
-- Diperlukan untuk perbandingan kolom skalar (UUID) bersamaan dengan rentang waktu (tstzrange) pada Exclusion Constraint.
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ==============================================================================
-- 2. TABEL PROFILES (Akun & Identitas Mahasiswa/Admin)
-- ==============================================================================
-- Terikat langsung 1-to-1 dengan auth.users milik Supabase Auth.
-- Tidak menyimpan password karena dikelola langsung oleh Supabase Auth.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  student_id text UNIQUE NOT NULL, -- Nomor Induk Mahasiswa (NIM)
  department text NOT NULL,        -- Program Studi / Jurusan
  cohort integer NOT NULL,         -- Angkatan (Tahun Masuk)
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Menyimpan profil mahasiswa dan administrator yang terikat pada auth.users';
COMMENT ON COLUMN public.profiles.student_id IS 'Nomor Induk Mahasiswa (NIM) unik';
COMMENT ON COLUMN public.profiles.role IS 'Peran sistem: student atau admin';

-- ==============================================================================
-- 3. TABEL CLASSES (Kelas / Rombongan Belajar Mahasiswa)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_code text UNIQUE NOT NULL, -- Contoh: TI-1A, TI-3B, TI-5A
  class_name text NOT NULL,        -- Contoh: Teknik Informatika 1A
  cohort integer NOT NULL,         -- Contoh: 2024
  department text NOT NULL DEFAULT 'Teknik Informatika',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.classes IS 'Menyimpan daftar kelas akademik/kelompok perkuliahan';

-- ==============================================================================
-- 4. TABEL CLASS_REPRESENTATIVES (Perwakilan Resmi Kelas)
-- ==============================================================================
-- Menghubungkan mahasiswa dengan kelas yang boleh mereka wakili untuk peminjaman ruangan.
-- Aturan Bisnis: Maksimal 3 perwakilan per kelas (ditegakkan via database trigger).
CREATE TABLE IF NOT EXISTS public.class_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(class_id, user_id)
);

COMMENT ON TABLE public.class_representatives IS 'Daftar mahasiswa yang diotorisasi mewakili kelas untuk membuat peminjaman ruangan';

-- ==============================================================================
-- 5. TABEL ROOMS (Daftar Ruangan Resmi Kampus)
-- ==============================================================================
-- Nama ruangan diselaraskan dengan data resmi Google Sheets (contoh: R.201, Lab Komputer 1, Aula Jurusan).
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_name text UNIQUE NOT NULL,
  building text NOT NULL DEFAULT 'Gedung Jurusan',
  capacity integer CHECK (capacity > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.rooms IS 'Menyimpan daftar fisik ruangan perkuliahan yang dapat dipinjam';

-- ==============================================================================
-- 6. TABEL BOOKINGS (Reservasi / Peminjaman Ruangan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  booked_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  purpose text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Aturan Integritas Waktu: Jam selesai harus setelah jam mulai
  CONSTRAINT chk_booking_time_valid CHECK (end_at > start_at),
  -- Validasi panjang teks keperluan peminjaman
  CONSTRAINT chk_booking_purpose_length CHECK (char_length(trim(purpose)) >= 5),

  -- ============================================================================
  -- ATURAN KRITIS ANTI-BENTROK: EXCLUSION CONSTRAINT TINGKAT POSTGRESQL
  -- ============================================================================
  -- Mencegah dua peminjaman pada ruangan yang sama dan rentang waktu yang bertabrakan.
  -- Berjalan pada level engine ACID PostgreSQL, kebal terhadap race-condition dua request bersamaan.
  -- Hanya berlaku jika status aktif ('pending' atau 'approved'). Peminjaman 'cancelled' / 'rejected' tidak memblokir ruangan.
  CONSTRAINT no_overlapping_active_bookings EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status IN ('pending', 'approved'))
);

COMMENT ON TABLE public.bookings IS 'Data peminjaman ruangan dengan perlindungan bentrok waktu di level database';
COMMENT ON CONSTRAINT no_overlapping_active_bookings ON public.bookings IS 'Mencegah tumpang tindih waktu untuk ruangan yang sama (ACID Exclusion Constraint)';

-- ==============================================================================
-- 7. FUNCTION & TRIGGER: PENEGAKAN MAKSIMAL 3 PERWAKILAN PER KELAS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_max_class_representatives()
RETURNS trigger AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT count(*)
  INTO current_count
  FROM public.class_representatives
  WHERE class_id = NEW.class_id;

  IF current_count >= 3 THEN
    RAISE EXCEPTION 'Kelas ini sudah mencapai batas maksimum 3 mahasiswa perwakilan resmi.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_enforce_max_representatives
BEFORE INSERT ON public.class_representatives
FOR EACH ROW
EXECUTE FUNCTION public.check_max_class_representatives();

-- ==============================================================================
-- 8. HELPER FUNCTION: ROLE CHECK (ADMIN VERIFICATION)
-- ==============================================================================
-- Fungsi SECURITY DEFINER untuk mengecek status admin tanpa mengekspos izin tabel ke publik.
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper untuk mengecek apakah user adalah perwakilan resmi dari suatu kelas
CREATE OR REPLACE FUNCTION public.is_class_representative(p_user_id uuid, p_class_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.class_representatives
    WHERE user_id = p_user_id AND class_id = p_class_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 9. TRIGGER: AUTO-SYNC PROFILES DARI SUPABASE AUTH (SIGN-UP HOOK)
-- ==============================================================================
-- Ketika user baru berhasil registrasi via Supabase Auth, buat profil publik secara otomatis.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, student_id, department, cohort, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Mahasiswa'),
    COALESCE(NEW.raw_user_meta_data->>'student_id', NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'department', 'Teknik Informatika'),
    COALESCE((NEW.raw_user_meta_data->>'cohort')::integer, 2024),
    'student'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS pada seluruh tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Kebijakan RLS: PROFILES
-- ------------------------------------------------------------------------------
-- 1. Siapapun yang terautentikasi dapat membaca profil dasar (untuk melihat nama peminjam)
CREATE POLICY "profiles_select_authenticated"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Mahasiswa hanya dapat mengubah profil miliknya sendiri (dan tidak bisa mengubah role)
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  role = (SELECT role FROM public.profiles WHERE id = auth.uid())
);

-- 3. Admin memiliki hak penuh mengelola profiles
CREATE POLICY "profiles_admin_all"
ON public.profiles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- B. Kebijakan RLS: CLASSES
-- ------------------------------------------------------------------------------
-- 1. Mahasiswa terautentikasi dapat melihat daftar kelas
CREATE POLICY "classes_select_authenticated"
ON public.classes FOR SELECT
TO authenticated
USING (true);

-- 2. Hanya admin yang boleh menambah, mengubah, atau menghapus kelas
CREATE POLICY "classes_admin_modify"
ON public.classes FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- C. Kebijakan RLS: CLASS_REPRESENTATIVES
-- ------------------------------------------------------------------------------
-- 1. Pengguna terautentikasi dapat melihat siapa saja perwakilan kelas
CREATE POLICY "representatives_select_authenticated"
ON public.class_representatives FOR SELECT
TO authenticated
USING (true);

-- 2. Hanya admin yang berwenang menunjuk atau mencabut hak perwakilan kelas
-- (Mencegah mahasiswa mengangkat dirinya sendiri menjadi perwakilan)
CREATE POLICY "representatives_admin_modify"
ON public.class_representatives FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- D. Kebijakan RLS: ROOMS
-- ------------------------------------------------------------------------------
-- 1. Pengguna terautentikasi dapat melihat ruangan aktif
CREATE POLICY "rooms_select_active"
ON public.rooms FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin(auth.uid()));

-- 2. Hanya admin yang berhak mengelola master ruangan
CREATE POLICY "rooms_admin_modify"
ON public.rooms FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- E. Kebijakan RLS: BOOKINGS
-- ------------------------------------------------------------------------------
-- 1. SELECT: Semua pengguna terautentikasi dapat melihat booking untuk pengecekan ketersediaan ruangan
CREATE POLICY "bookings_select_authenticated"
ON public.bookings FOR SELECT
TO authenticated
USING (true);

-- 2. INSERT: Mahasiswa HANYA BISA membuat booking jika:
--    - Menggunakan identitas akunnya sendiri (booked_by = auth.uid())
--    - Mahasiswa tersebut terdaftar sebagai PERWAKILAN RESMI dari class_id yang bersangkutan
--    - ATAU user adalah admin
CREATE POLICY "bookings_insert_authorized_representative"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
  booked_by = auth.uid()
  AND (
    public.is_class_representative(auth.uid(), class_id)
    OR public.is_admin(auth.uid())
  )
);

-- 3. UPDATE: Pembuat booking dapat membatalkan booking miliknya (status -> 'cancelled')
--    Admin dapat mengubah status apapun (approval, reject, dll.)
CREATE POLICY "bookings_update_status"
ON public.bookings FOR UPDATE
TO authenticated
USING (
  (booked_by = auth.uid() AND status IN ('pending', 'approved'))
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  (
    booked_by = auth.uid()
    AND status = 'cancelled'
    -- Pastikan user tidak bisa mengubah data penting lain selain pembatalan
    AND room_id = (SELECT room_id FROM public.bookings WHERE id = bookings.id)
    AND class_id = (SELECT class_id FROM public.bookings WHERE id = bookings.id)
  )
  OR public.is_admin(auth.uid())
);

-- 4. DELETE: Tidak ada penghapusan fisik dari client (soft-status 'cancelled' / audit trail).
--    Hanya admin yang memiliki wewenang delete fisik jika diperlukan pembersihan data lama.
CREATE POLICY "bookings_admin_delete"
ON public.bookings FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ==============================================================================
-- 11. INDEXES PERFORMA QUERY
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_bookings_room_time ON public.bookings (room_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_class_id ON public.bookings (class_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booked_by ON public.bookings (booked_by);
CREATE INDEX IF NOT EXISTS idx_class_reps_user_class ON public.class_representatives (user_id, class_id);
CREATE INDEX IF NOT EXISTS idx_profiles_student_id ON public.profiles (student_id);

-- ==============================================================================
-- 12. SEED DATA DEFAULT (Ruangan & Kelas Resmi SchedU)
-- ==============================================================================
-- Menyinkronkan daftar ruangan dengan data perkuliahan aktual yang ada di SchedU tanpa mengubah penamaan.
INSERT INTO public.rooms (room_name, building, capacity, is_active) VALUES
  ('R.201', 'Gedung Jurusan Lt. 2', 40, true),
  ('R.202', 'Gedung Jurusan Lt. 2', 40, true),
  ('R.203', 'Gedung Jurusan Lt. 2', 40, true),
  ('R.301', 'Gedung Jurusan Lt. 3', 45, true),
  ('R.302', 'Gedung Jurusan Lt. 3', 45, true),
  ('Lab Komputer 1', 'Gedung Laboratorium Lt. 1', 35, true),
  ('Lab Komputer 2', 'Gedung Laboratorium Lt. 1', 35, true),
  ('Lab Jaringan', 'Gedung Laboratorium Lt. 2', 30, true),
  ('Lab Multimedia', 'Gedung Laboratorium Lt. 2', 30, true),
  ('Aula Jurusan', 'Gedung Utama Lt. 1', 120, true)
ON CONFLICT (room_name) DO NOTHING;

-- Seed kelas perkuliahan aktif
INSERT INTO public.classes (class_code, class_name, cohort, department) VALUES
  ('TI-1A', 'Teknik Informatika 1A', 2024, 'Teknik Informatika'),
  ('TI-1B', 'Teknik Informatika 1B', 2024, 'Teknik Informatika'),
  ('TI-3A', 'Teknik Informatika 3A', 2023, 'Teknik Informatika'),
  ('TI-3B', 'Teknik Informatika 3B', 2023, 'Teknik Informatika'),
  ('TI-5A', 'Teknik Informatika 5A', 2022, 'Teknik Informatika'),
  ('TI-5B', 'Teknik Informatika 5B', 2022, 'Teknik Informatika'),
  ('TI-7A', 'Teknik Informatika 7A', 2021, 'Teknik Informatika'),
  ('TI-7B', 'Teknik Informatika 7B', 2021, 'Teknik Informatika')
ON CONFLICT (class_code) DO NOTHING;

-- ==============================================================================
-- 13. TABEL PEMINJAMAN_RUANGAN (Koneksi Langsung SchedU UI)
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_peminjaman_ruangan_tanggal 
ON public.peminjaman_ruangan (ruangan, tanggal, status);

ALTER TABLE public.peminjaman_ruangan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Siapapun dapat melihat peminjaman aktif" ON public.peminjaman_ruangan;
CREATE POLICY "Siapapun dapat melihat peminjaman aktif"
ON public.peminjaman_ruangan
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Siapapun dapat membuat peminjaman" ON public.peminjaman_ruangan;
DROP POLICY IF EXISTS "Hanya user login yang dapat membuat peminjaman" ON public.peminjaman_ruangan;
CREATE POLICY "Siapapun dapat membuat peminjaman"
ON public.peminjaman_ruangan
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "User login dapat membatalkan peminjaman" ON public.peminjaman_ruangan;
DROP POLICY IF EXISTS "Pengguna dapat membatalkan peminjaman" ON public.peminjaman_ruangan;
CREATE POLICY "Pengguna dapat membatalkan peminjaman"
ON public.peminjaman_ruangan
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.check_peminjaman_bentrok()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'aktif' THEN
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

DROP TRIGGER IF EXISTS trigger_cek_bentrok_peminjaman ON public.peminjaman_ruangan;
CREATE TRIGGER trigger_cek_bentrok_peminjaman
BEFORE INSERT OR UPDATE ON public.peminjaman_ruangan
FOR EACH ROW
EXECUTE FUNCTION public.check_peminjaman_bentrok();
