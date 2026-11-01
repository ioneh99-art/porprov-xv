// scripts/uji-lapor-kembar.ts — laporan kembar situs KONI Jabar ↔ PIC. Dijalankan: npm run uji:lapor-kembar
import { lagaSama, pasangKembar, rencanaSahkan, ALASAN_KEMBAR, type LaporKembar } from '../src/lib/lapor-kembar'

let lulus = 0, gagal = 0
const cek = (nama: string, dapat: any, harap: any) => {
  const a = JSON.stringify(dapat), b = JSON.stringify(harap)
  if (a === b) lulus++
  else { gagal++; console.log(`  GAGAL ${nama}\n     dapat  ${a}\n     harap  ${b}`) }
}
const L = (o: Partial<LaporKembar> & { id: number }): LaporKembar =>
  ({ cabor_id: 146, tanggal: '2026-11-01', lawan: 'Kota Bandung', partai_id: null, hasil: 'kalah', peringkat: null, status: 'menunggu', ref_luar: null, pelapor_nama: 'PIC Hockey', ...o })

// Kasus nyata 1 Nov: Hockey (situs #135 berpartai 14, PIC #138 tanpa partai, sudah disahkan).
const s135 = L({ id: 135, ref_luar: '9001', partai_id: 14, pelapor_nama: 'Situs KONI Jabar' })
const p138 = L({ id: 138, status: 'disahkan' })
cek('laga sama: lawan sama, satu sisi tanpa partai', lagaSama(s135, p138), true)
cek('laga beda: tanggal beda', lagaSama(s135, L({ id: 1, tanggal: '2026-11-02' })), false)
cek('laga beda: cabor beda', lagaSama(s135, L({ id: 1, cabor_id: 151 })), false)
cek('laga beda: dua-duanya berpartai, partai beda', lagaSama(s135, L({ id: 1, partai_id: 15 })), false)
cek('laga sama: partai sama walau lawan ditulis lain', lagaSama(s135, L({ id: 1, partai_id: 14, lawan: 'KOTA BDG' })), true)
cek('laga beda: lawan beda', lagaSama(s135, L({ id: 1, lawan: 'Kab. Bogor' })), false)
cek('dua laporan PIC bukan kembar situs', lagaSama(L({ id: 1 }), L({ id: 2 })), false)
cek('lawan kosong tidak dianggap sama', lagaSama(L({ id: 1, ref_luar: 'x', lawan: null }), L({ id: 2, lawan: null })), false)

const k = pasangKembar([s135, p138])
cek('pasangan situs → PIC', k.get(135), { id: 138, sumber: 'pic', status: 'disahkan', pelapor_nama: 'PIC Hockey', hasil_sama: true })
cek('pasangan PIC → situs', k.get(138)?.id, 135)
cek('yang ditolak tidak dipasangkan', pasangKembar([s135, { ...p138, status: 'ditolak' }]).size, 0)
cek('dua PIC cocok dengan satu situs → tidak dipasangkan (ragu)', pasangKembar([s135, L({ id: 140 }), L({ id: 141 })]).size, 0)
cek('hasil beda ditandai', pasangKembar([s135, L({ id: 139, hasil: 'menang' })]).get(135)?.hasil_sama, false)
cek('peringkat beda = hasil beda', pasangKembar([L({ id: 1, ref_luar: 'x', hasil: 'peringkat', peringkat: 4 }), L({ id: 2, hasil: 'peringkat', peringkat: 5 })]).get(1)?.hasil_sama, false)

// Rencana tombol Sahkan.
cek('sahkan situs, PIC sudah disahkan → situs ditutup saja', rencanaSahkan(s135, k.get(135)), { sahkan: null, tutup: 135 })
const pMenunggu = L({ id: 140 })
const k2 = pasangKembar([s135, pMenunggu])
cek('sahkan situs, PIC menunggu → PIC yang disahkan', rencanaSahkan(s135, k2.get(135)), { sahkan: 140, tutup: 135 })
cek('sahkan PIC → situs ikut ditutup', rencanaSahkan(pMenunggu, k2.get(140)), { sahkan: 140, tutup: 135 })
const sDisahkan = { ...s135, status: 'disahkan' }
cek('sahkan PIC, situs terlanjur disahkan & sama → situs ditutup (medali tak dobel)', rencanaSahkan(pMenunggu, pasangKembar([sDisahkan, pMenunggu]).get(140)), { sahkan: 140, tutup: 135 })
const pBeda = L({ id: 141, hasil: 'menang' })
cek('sahkan situs, hasil PIC beda → ditolak dgn pesan', 'galat' in rencanaSahkan(s135, pasangKembar([s135, pBeda]).get(135)), true)
cek('sahkan PIC, hasil situs beda & menunggu → PIC disahkan, situs tetap', rencanaSahkan(pBeda, pasangKembar([s135, pBeda]).get(141)), { sahkan: 141, tutup: null })
cek('sahkan PIC, situs beda & sudah disahkan → ditolak dgn pesan', 'galat' in rencanaSahkan(pBeda, pasangKembar([sDisahkan, pBeda]).get(141)), true)
cek('tanpa kembar → sahkan biasa', rencanaSahkan(pMenunggu, undefined), { sahkan: 140, tutup: null })
cek('alasan kembar', ALASAN_KEMBAR(138), 'Kembar — digantikan laporan PIC #138')

console.log(`uji-lapor-kembar: ${lulus} lulus, ${gagal} gagal`)
if (gagal) process.exit(1)
