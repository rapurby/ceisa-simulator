-- ============================================================
-- CEISA Simulator — Pembersihan database gabungan (CDP + CEISA)
-- Jalankan SEKALI di Postgres Railway (tab "Data" > Query, atau psql),
-- SEBELUM men-deploy backend CEISA versi baru.
--
-- Aman: hanya menghapus tabel milik CEISA yang salah bentuk / sisa
-- versi lama. TIDAK menyentuh tabel DeclarAI (users, declarations,
-- declaration_item, audit_logs, qr_sessions, alembic_version).
-- ============================================================

-- 1. Tabel sisa versi awal CEISA (sebelum rename) — sudah tidak dipakai
DROP TABLE IF EXISTS incoming_declarations;

-- 2. Tabel CEISA yang mungkin terlanjur dibuat dengan enum yang salah
--    (memakai type "declarationstatus" milik DeclarAI).
--    Keduanya masih kosong / hanya berisi data test, aman di-drop.
--    Backend CEISA akan membuat ulang otomatis saat startup
--    dengan enum baru "ceisa_declaration_status" + seed admin.
DROP TABLE IF EXISTS ceisa_declarations;
DROP TABLE IF EXISTS ceisa_users;

-- 3. JANGAN drop type "declarationstatus" atau "documenttype" —
--    itu milik DeclarAI dan masih dipakai tabel declarations.

-- Verifikasi: daftar tabel yang tersisa harusnya hanya milik DeclarAI
-- SELECT table_name FROM information_schema.tables
--  WHERE table_schema = 'public' ORDER BY table_name;
