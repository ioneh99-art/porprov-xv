// scripts/uji-jejak-partai.ts — mengunci aturan jejak per partai (Report Pertandingan).
// Dijalankan: npm run uji:jejak-partai
import { ringkasJejak, susunJejak, tahapDari, type LaporanJejak, type PartaiJejak } from '../src/lib/jejak-partai'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}

const P = (o: Partial<PartaiJejak>): PartaiJejak => ({ id: 1, cabor_id: 151, tanggal: '2026-10-31', jam: '08:00', nomor_teks: 'Beregu (Pi)', babak: 'Pool W', lawan: 'Kota Cirebon', venue: null, status: 'terjadwal', ...o })
const L = (o: Partial<LaporanJejak>): LaporanJejak => ({ id: 1, partai_id: null, cabor_id: 151, tanggal: '2026-10-31', lawan: 'Kota Cirebon', nomor_teks: 'Beregu (Pi)', status: 'menunggu', created_at: '2026-10-31T04:00:00Z', ...o })
const tahap = (p: PartaiJejak[], l: LaporanJejak[], hari = '2026-10-31') => susunJejak(p, l, hari).map(b => `${b.kunci}:${b.tahap}${b.perluLaporan ? '!' : ''}`)

cek('tahap: disahkan menang atas lainnya', tahapDari([{ status: 'ditolak' }, { status: 'disahkan' }]), 'disahkan')
cek('tahap: semua ditolak', tahapDari([{ status: 'ditolak' }]), 'ditolak')
cek('tahap: kosong = belum', tahapDari([]), 'belum')

cek('partai hari ini tanpa laporan = perlu laporan', tahap([P({})], []), ['p1:belum!'])
cek('partai besok tanpa laporan = belum, tidak ditandai', tahap([P({ tanggal: '2026-11-01' })], []), ['p1:belum'])
cek('partai batal tidak ditandai', tahap([P({ status: 'batal' })], []), ['p1:belum'])
cek('laporan bertaut partai_id', tahap([P({}), P({ id: 2, lawan: 'Kab. Garut' })], [L({ partai_id: 2, lawan: 'beda', status: 'disahkan' })]), ['p1:belum!', 'p2:disahkan'])
cek('laporan tanpa partai_id cocok lewat lawan (huruf diabaikan)', tahap([P({}), P({ id: 2, lawan: 'Kab. Garut', jam: '10:00' })], [L({ lawan: 'kab garut' })]), ['p1:belum!', 'p2:menunggu'])
cek('lawan kosong + satu-satunya partai cabor itu → dipakai', tahap([P({})], [L({ lawan: null, status: 'disahkan' })]), ['p1:disahkan'])
cek('lawan kosong + dua partai → laporan berdiri sendiri (urut jam laporan)', tahap([P({}), P({ id: 2, lawan: 'Kab. Garut', jam: '10:00' })], [L({ lawan: null, jam: '09:00' })]), ['p1:belum!', 'l1:menunggu', 'p2:belum!'])
const G = (id: number, kelas: string) => P({ id, cabor_id: 25, tanggal: '2026-11-03', jam: '13:00', nomor_teks: kelas, lawan: null, babak: 'Eliminasi' })
const gulat = [G(1, 'Grego - kelas s/d 55 kg (Pa)'), G(2, 'Grego - kelas s/d 67 kg (Pa)'), G(3, 'Grego - kelas s/d 77 kg (Pa)')]
cek('gulat: tanpa lawan, banyak kelas sehari → cocok lewat nama kelas', tahap(gulat, [L({ cabor_id: 25, tanggal: '2026-11-03', lawan: null, nomor_teks: 'grego kelas s/d 67 KG (pa)', status: 'disahkan' })], '2026-11-03'), ['p1:belum!', 'p2:disahkan', 'p3:belum!'])
cek('gulat: lawan diisi PIC (tak ada di jadwal) tetap cocok lewat kelas', tahap(gulat, [L({ cabor_id: 25, tanggal: '2026-11-03', lawan: 'Kota Bekasi', nomor_teks: 'Grego - kelas s/d 77 kg (Pa)' })], '2026-11-03'), ['p1:belum!', 'p2:belum!', 'p3:menunggu'])
cek('nomor berawalan disiplin tetap cocok', tahap([P({ nomor_teks: 'Beregu (Pa)', lawan: 'A' }), P({ id: 2, nomor_teks: 'Beregu (Pi)', lawan: 'B', jam: '10:00' })], [L({ nomor_teks: 'BOLA VOLI PASIR · Beregu (Pi)', lawan: null })]), ['p1:belum!', 'p2:menunggu'])
cek('nomor sama dua partai (beda lawan) → lawan yang memutus', tahap([P({}), P({ id: 2, lawan: 'Kab. Garut', jam: '10:00' })], [L({ lawan: 'Kab. Garut' })]), ['p1:belum!', 'p2:menunggu'])
cek('kelas tidak ada di jadwal hari itu → berdiri sendiri', tahap(gulat, [L({ id: 9, cabor_id: 25, tanggal: '2026-11-03', lawan: null, nomor_teks: 'Grego - kelas s/d 130 kg (Pa)', jam: '14:00' })], '2026-11-03'), ['p1:belum!', 'p2:belum!', 'p3:belum!', 'l9:menunggu'])
cek('laporan cabor lain tanpa jadwal tetap tampil', tahap([], [L({ cabor_id: 9, status: 'ditolak' })]), ['l1:ditolak'])
cek('laporan terbaru di depan', susunJejak([P({})], [L({ id: 1, status: 'ditolak' }), L({ id: 2, created_at: '2026-10-31T05:00:00Z' })], '2026-10-31')[0].laporan.map(l => l.id), [2, 1])
cek('ringkas', ringkasJejak(susunJejak([P({}), P({ id: 2, lawan: 'X', jam: '09:00' }), P({ id: 3, lawan: 'Y', jam: '10:00' })], [L({ partai_id: 2, status: 'disahkan' }), L({ id: 2, partai_id: 3 })], '2026-10-31')),
  { partai: 3, disahkan: 1, menunggu: 1, ditolak: 0, perluLaporan: 1 })

console.log(`uji-jejak-partai: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
