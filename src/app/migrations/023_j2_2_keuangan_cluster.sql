-- 023_j2_2_keuangan_cluster.sql
-- Jenis 2 / J2-2 (2026-07-19) — cluster keuangan. Sudah diterapkan ke live.

-- tenants: tulis (create/update/delete) dipindah ke /api/superadmin/tenants (service
-- key + guard superadmin + audit). Ganti policy ALL -> SELECT-only (baca tema login &
-- routing tenant tetap dari anon). Teruji: anon read OK, anon write 401, route super OK,
-- konida 403.
DROP POLICY IF EXISTS allow_all_tenants ON tenants;
CREATE POLICY tenants_read ON tenants FOR SELECT TO public USING (true);

-- invoices/invoice_items: BACA anon ditutup (data finansial). Baca kini lewat
-- /api/superadmin/invoices (service key, guard). Tanpa policy publik = service-only.
-- (Policy tulis sudah dicabut di J2-1; policy SELECT sementara juga dicabut di sini.)
-- Teruji: anon read -> [] (kosong), route super -> data.
DROP POLICY IF EXISTS invoices_read ON invoices;
DROP POLICY IF EXISTS invoice_items_read ON invoice_items;
