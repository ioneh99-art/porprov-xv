// scripts/uji-jadwal.ts — mengunci perilaku penerjemah nama jadwal.
// Dijalankan: npm run uji:jadwal
import { caborDariJadwal, tanggalJadwal } from '../src/lib/jadwal'

const CABOR_DB = [
  'Aeromodelling','Akuatik','Anggar','Angkat Berat','Angkat Besi','Arung Jeram','Atletik',
  'Balap Motor','Balap Sepeda','Biliar','Binaraga','Bola Basket','Bola Voli','Boling',
  'Bulutangkis','Catur','Dancesport','Dayung','Drumband','Equestrian','Esport','Floorball',
  'Futsal','Gantole','Gateball','Golf','Gulat','Hapkido','Hockey','Ibca Mma','Judo','Jujitsu',
  'Karate','Kickboxing','Kurash','Layar','Menembak','Modern Pentathlon','Muaythai','Pacuan',
  'Panahan','Panjat Tebing','Paralayang','Paramotor','Pencak Silat','Petanque','Rugby','Sambo',
  'Selam','Senam','Sepak Bola','Sepak Takraw','Sepatu Roda','Shorinji Kempo','Squash',
  'Taekwondo','Tenis Meja','Terjun Payung','Tinju','Triathlon','Wushu',
]

let lulus = 0, gagal = 0
const uji = (nama: string, harap: string | null, ket = '') => {
  const dapat = caborDariJadwal(nama, CABOR_DB)
  if (dapat === harap) { lulus++ }
  else { gagal++; console.log(`  GAGAL  "${nama}" → ${dapat} (harusnya ${harap}) ${ket}`) }
}

// ── Nama yang sudah persis ──
uji('Panahan', 'Panahan'); uji('Rugby', 'Rugby'); uji('Catur', 'Catur')
uji('Sepak Takraw', 'Sepak Takraw'); uji('Panjat Tebing', 'Panjat Tebing')
uji('Modern Pentathlon', 'Modern Pentathlon')

// ── Beda ejaan ──
uji('Hoki Indoor', 'Hockey'); uji('Hoki Outdoor - Field', 'Hockey')
uji('E-Sport', 'Esport'); uji('Biliard', 'Biliar'); uji('Bowling', 'Boling')
uji('Dansa', 'Dancesport'); uji('Kick Boxing', 'Kickboxing')
uji('Bolavoli Indoor', 'Bola Voli'); uji('Bola Voli Pasir', 'Bola Voli')
uji('IBCA - MMA', 'Ibca Mma')
uji('Aquatic - Renang', 'Akuatik', '(salah ketik di berkas asal)')

// ── Banyak baris jadwal untuk satu cabor ──
for (const n of ['Canoeing','Canoeing - Slalom','Rowing','Rowing - Beach','DBR'])
  uji(n, 'Dayung')
for (const n of ['Akuatik - Renang','Akuatik - Polo Air','Akuatik - Renang Artistik',
                 'Akuatik - Renang Perairan Terbuka']) uji(n, 'Akuatik')
for (const n of ['Gimnastik Artistik','Gimnastik Ritmik','Gimnastik Aerobik']) uji(n, 'Senam')
for (const n of ['Bola Basket 5X5','Bola Basket 3X3']) uji(n, 'Bola Basket')
for (const n of ['Sepak Bola Putra','Sepak Bola Putri']) uji(n, 'Sepak Bola')
for (const n of ['Menembak Indoor','Menembak Outdoor']) uji(n, 'Menembak')
for (const n of ['Selam Kolam','Selam Laut']) uji(n, 'Selam')
for (const n of ['Bermotor Road Race','Bermotor - Grass Track']) uji(n, 'Balap Motor')
for (const n of ['Balap Sepeda Road','Balap Sepeda MTB','Balap Sepeda BMX - Racing',
                 'Balap Sepeda BMX - Freestyle Park, Flat Land, Trial']) uji(n, 'Balap Sepeda')

// ── Aerosport pecah jadi beberapa cabor berbeda, bukan satu ──
uji('Aerosport - Aeromodeling', 'Aeromodelling')
uji('Aerosport - Paralayang', 'Paralayang')
uji('Aerosport - Paramotor', 'Paramotor')
uji('Aerosport - Gantole', 'Gantole')
uji('Aerosport - Terbang Layang', null, '(Kab. Bandung tidak ikut)')

// ── Berkuda: yang khusus harus menang atas yang umum ──
uji('Berkuda Pacu', 'Pacuan', '(bukan Equestrian)')
uji('Berkuda Dressage', 'Equestrian')

// ── Marathon adalah nomor atletik, didaftar terpisah di jadwal ──
uji('Marathon', 'Atletik')

// ── Yang memang bukan milik Kab. Bandung — wajib null, jangan dipaksa cocok ──
uji('Mini 4WD', null); uji('Sakteboard', null); uji('Drumband', 'Drumband')
uji('', null); uji('   ', null)

// ── Tanggal: bentuk lain harus null, bukan ditebak ──
const t = (s: any, harap: string | null) => {
  const d = tanggalJadwal(s)
  if (d === harap) lulus++
  else { gagal++; console.log(`  GAGAL tanggal "${s}" → ${d} (harusnya ${harap})`) }
}
t('08/11/2026', '2026-11-08'); t('2026-11-20 00:00:00', '2026-11-20')
t('11 s.d 19 November 2026', null); t('', null); t('8/11/2026', null)
// Nomor seri Excel — bentuk sel tanggal yang sebenarnya. Dua angka pertama
// diambil dari berkas panitia: 46333 = upacara pembukaan, 46346 = penutupan.
// Sempat mundur sehari ketika dibaca sebagai Date di zona Asia/Jakarta.
t(46333 as any, '2026-11-07')
t(46346 as any, '2026-11-20')
t(46343 as any, '2026-11-17')
t(0 as any, null)

// Date tetap diterima untuk berkas lain yang menyajikannya begitu.
t(new Date(2026, 10, 20) as any, '2026-11-20')
t(new Date(2026, 0, 1) as any, '2026-01-01')
t(new Date('tidak valid') as any, null)
t(null as any, null)

console.log(`\nLULUS ${lulus} · GAGAL ${gagal}`)
process.exit(gagal ? 1 : 0)
