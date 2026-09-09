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

/**
 * Ubah isi sel tanggal jadi "YYYY-MM-DD". Mengembalikan null bila bentuknya
 * tidak dikenali — BUKAN menebak, sebab tanggal salah lebih berbahaya
 * daripada tanggal kosong.
 *
 * Menerima Date juga: sebagian sel di berkas panitia berupa tanggal Excel
 * sungguhan, bukan teks. Sel semacam itu pernah lolos jadi null diam-diam,
 * dan yang kena justru dua baris terpenting — upacara pembukaan dan
 * penutupan, yang dipakai seluruh hitung mundur.
 *
 * Date dibaca lewat bagian lokalnya, bukan toISOString(): mesin ini berzona
 * Asia/Jakarta, dan konversi ke UTC menggeser tanggalnya mundur sehari.
 */
export function tanggalJadwal(v: string | Date | number | null | undefined): string | null {
  // Nomor seri Excel: hari sejak 30 Desember 1899. Ini bentuk yang paling
  // aman — tidak menyentuh zona waktu sama sekali.
  //
  // Membaca sel yang sama sebagai Date justru berbahaya: pustaka pembaca
  // memberi "2026-11-19T16:59:48Z" untuk tanggal 20 November, dan di zona
  // Asia/Jakarta bagian lokalnya jatuh di 19 November pukul 23:59:48 —
  // mundur sehari. Dua upacara PORPROV sempat kena persis begitu.
  if (typeof v === 'number' && isFinite(v) && v > 0) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(v) * 86400000
    const d = new Date(ms)
    const p = (n: number) => String(n).padStart(2, '0')
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return null
    const p = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`
  }
  const s = (v ?? '').toString().trim()
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null
}

/** Alias tambahan khusus berkas klasifikasi pengurus. Ejaannya berbeda lagi
 *  dari berkas jadwal — "BINA RAGA", "PENTAQUE", "ᴥ OWS", "eSPORT". */
const ALIAS_KLASIFIKASI: [string, string][] = [
  ['BINA RAGA', 'Binaraga'], ['BINARAGA', 'Binaraga'],
  ['PENTAQUE', 'Petanque'], ['PETANQUE', 'Petanque'],
  ['OWS', 'Akuatik'], ['RENANG INDAH', 'Akuatik'], ['RENANG', 'Akuatik'],
  ['POLO AIR', 'Akuatik'], ['LONCAT INDAH', 'Akuatik'],
  ['HOCKEY INDOOR', 'Hockey'], ['HOCKEY OUTDOOR', 'Hockey'], ['HOCKEY', 'Hockey'],
  ['VOLI INDOOR', 'Bola Voli'], ['BOLA VOLI PANTAI', 'Bola Voli'], ['BOLA VOLI', 'Bola Voli'],
  ['BULU TANGKIS', 'Bulutangkis'],
  ['PACU', 'Pacuan'], ['BERKUDA PACU', 'Pacuan'],
  ['EQUISTRIAN', 'Equestrian'], ['BERKUDA EQUISTRIAN', 'Equestrian'],
  ['PENTATLON', 'Modern Pentathlon'], ['PENTATHLON', 'Modern Pentathlon'],
  ['IBCA MMA', 'Ibca Mma'], ['IBCA', 'Ibca Mma'],
  ['ROADRACE', 'Balap Motor'], ['GRASS TRACK', 'Balap Motor'],
  ['4WD', 'Balap Motor'], ['BALAP MOTOR', 'Balap Motor'],
  ['SEPEDA', 'Balap Sepeda'],
  ['BASKET', 'Bola Basket'],
  ['SEPAKBOLA', 'Sepak Bola'],
  ['AEROMODELING', 'Aeromodelling'],
  ['KEMPO', 'Shorinji Kempo'],
]

/**
 * Terjemahkan nama cabor pada berkas klasifikasi pengurus.
 * Memakai penerjemah jadwal lebih dulu, lalu kamus tambahan di atas.
 */
export function caborDariKlasifikasi(nama: string, caborDb: string[]): string | null {
  // Berkas ini memakai penanda "ᴥ" di depan sebagian nama; dibuang dulu.
  // Sasaran ES5, jadi \p{L} tidak tersedia — huruf yang diizinkan disebut satu per satu.
  const bersih = (nama ?? '').replace(/[^A-Za-z0-9\s()\-]/g, ' ').replace(/\s+/g, ' ').trim()
  const lewatJadwal = caborDariJadwal(bersih, caborDb)
  if (lewatJadwal) return lewatJadwal

  const n = norm(bersih)
  const berurut = [...ALIAS_KLASIFIKASI].sort((a, b) => b[0].length - a[0].length)
  for (const [awalan, tujuan] of berurut) {
    if (n === awalan || n.startsWith(awalan + ' ')) {
      const k = caborDb.find(c => norm(c) === norm(tujuan))
      if (k) return k
    }
  }
  return null
}
