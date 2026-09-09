// src/lib/jadwal.ts
// Menerjemahkan nama cabor pada jadwal resmi PORPROV ke nama cabor di sistem.
//
// Kenapa perlu berkas sendiri, tidak menumpang pencocokan.ts: berkas itu
// menerjemahkan nama FOLDER foto, kamusnya disetel untuk itu, dan sudah punya
// 43 uji yang mengunci perilakunya. Nama pada jadwal berbentuk lain —
// "Aerosport - Aeromodeling", "Canoeing - Slalom", "Bola Basket 5X5" — jadi
// dipisah supaya menambah alias di sini tidak menggoyang pencocokan foto.
//
// Aturan utamanya: satu nama di sistem bisa menaungi BANYAK baris jadwal.
// Dayung punya lima (Canoeing, Canoeing-Slalom, Rowing, Rowing-Beach, DBR),
// Akuatik lima, Senam tiga. Karena itu hasilnya bukan satu tanggal, tapi
// rentang: kapan cabor itu pertama bertanding dan kapan terakhir.

const norm = (s: string) =>
  (s ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

/** Awalan nama pada jadwal → nama cabor di sistem. Diuji dari yang terpanjang,
 *  supaya "Berkuda Pacu" tidak keburu tertangkap aturan "Berkuda". */
const ALIAS_JADWAL: [string, string][] = [
  ['AEROSPORT AEROMODELING', 'Aeromodelling'],
  ['AEROSPORT PARALAYANG',   'Paralayang'],
  ['AEROSPORT PARAMOTOR',    'Paramotor'],
  ['AEROSPORT GANTOLE',      'Gantole'],
  ['AEROSPORT TERJUN PAYUNG','Terjun Payung'],
  ['BERKUDA PACU',           'Pacuan'],
  ['BERKUDA',                'Equestrian'],
  ['CANOEING',               'Dayung'],
  ['ROWING',                 'Dayung'],
  ['DBR',                    'Dayung'],
  ['DAYUNG',                 'Dayung'],
  ['GIMNASTIK',              'Senam'],
  ['SENAM',                  'Senam'],
  ['AQUATIC',                'Akuatik'],
  ['AKUATIK',                'Akuatik'],
  ['HOKI',                   'Hockey'],
  ['BOLAVOLI',               'Bola Voli'],
  ['BOLA VOLI',              'Bola Voli'],
  ['BOLA BASKET',            'Bola Basket'],
  ['SEPAK BOLA',             'Sepak Bola'],
  ['FUTSAL',                 'Futsal'],
  ['MENEMBAK',               'Menembak'],
  ['BERMOTOR',               'Balap Motor'],
  ['BALAP SEPEDA',           'Balap Sepeda'],
  ['SELAM',                  'Selam'],
  ['MARATHON',               'Atletik'],   // nomor atletik, didaftar terpisah
  ['IBCA MMA',               'Ibca Mma'],
  ['E SPORT',                'Esport'],
  ['ESPORT',                 'Esport'],
  ['BILIARD',                'Biliar'],
  ['BOWLING',                'Boling'],
  ['DANSA',                  'Dancesport'],
  ['KICK BOXING',            'Kickboxing'],
  ['SHORINJI KEMPO',         'Shorinji Kempo'],
  ['KEMPO',                  'Shorinji Kempo'],
  ['MODERN PENTATHLON',      'Modern Pentathlon'],
]

/**
 * Cari cabor di sistem yang dimaksud satu baris jadwal.
 * `caborDb` adalah daftar cabor_nama_raw yang benar-benar ada — jawaban selalu
 * salah satu dari situ, atau null. Tidak pernah menebak nama baru.
 */
export function caborDariJadwal(namaJadwal: string, caborDb: string[]): string | null {
  const n = norm(namaJadwal)
  if (!n) return null

  const cari = (target: string) =>
    caborDb.find(c => norm(c) === norm(target)) ?? null

  // 1. Persis sama — jalur tercepat dan paling aman.
  const persis = cari(n)
  if (persis) return persis

  // 2. Lewat kamus. Diurut dari alias terpanjang supaya yang lebih khusus menang.
  const berurut = [...ALIAS_JADWAL].sort((a, b) => b[0].length - a[0].length)
  for (const [awalan, tujuan] of berurut) {
    if (n === awalan || n.startsWith(awalan + ' ')) {
      const k = cari(tujuan)
      if (k) return k
    }
  }

  // 3. Nama jadwal berimbuhan disiplin: "Sepak Takraw", "Panjat Tebing" sudah
  //    tertangkap langkah 1. Sisanya dicoba dengan membuang ekor setelah
  //    tanda pisah — "Hoki Outdoor - Field" → "Hoki Outdoor" → "Hoki".
  const kata = n.split(' ')
  for (let ambil = kata.length - 1; ambil >= 1; ambil--) {
    const potong = kata.slice(0, ambil).join(' ')
    const k = cari(potong)
    if (k) return k
    const alias = berurut.find(([a]) => a === potong)
    if (alias) {
      const ka = cari(alias[1])
      if (ka) return ka
    }
  }

  return null
}

/** Ubah "08/11/2026" jadi "2026-11-08". Mengembalikan null bila bentuknya lain,
 *  BUKAN menebak — tanggal salah lebih berbahaya daripada tanggal kosong. */
export function tanggalJadwal(s: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s ?? '').trim())
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec((s ?? '').trim())
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null
}
