// Membuat "Laporan Akhir PORPROV XV — Versi Kab. Bandung" (.docx) dari data.json + grafik/*.png
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, ImageRun, PageBreak, Header, Footer, PageNumber, TableOfContents, LevelFormat,
} = require('docx')

const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8'))
const KELUAR = process.argv[2] || path.join(__dirname, 'Laporan.docx')
const LEBAR = 9638 // A4 21 cm − 2 × 2 cm, dalam DXA
const FONT = 'Arial'
const BIRU = '1F4E79', ABU = 'F2F4F7', GARIS = 'C9D3DE'

// ── angka bantu ─────────────────────────────────────────────────────────
const kb = D.kb
const n = (x, d = 0) => (x == null ? '—' : Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }))
const pct = (x, d = 0) => (x == null ? '—' : `${n(x * 100, d)}%`)
const tgl = s => { if (!s) return '—'; const b = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']; const [y, m, d] = s.split('-'); return `${Number(d)} ${b[Number(m)]}` }
const T54 = D.target54
const tercapai = T54.filter(x => x.realisasi >= x.emas), lewat = T54.filter(x => x.realisasi > x.emas), kurang = T54.filter(x => x.realisasi < x.emas)
const emasDariTarget = T54.reduce((t, x) => t + x.realisasi, 0)
const kekurangan = kurang.reduce((t, x) => t + (x.emas - x.realisasi), 0)
const kelebihan = lewat.reduce((t, x) => t + (x.realisasi - x.emas), 0)
const luar = D.emasLuarTarget, emasLuar = luar.reduce((t, x) => t + x.emas, 0)
const P74 = D.proyeksi74
const hit74 = k => P74.filter(p => p.hasil === k).length
const FB = D.fileB.silang, fbEmas = FB.emas || {}
const fbTargetEmas = Object.values(fbEmas).reduce((a, b) => a + b, 0)
const fbTanpaTargetEmas = (FB['tanpa target'] || {}).emas || 0
const kl = D.klasemen
const peringkatDari = (arr, v) => arr.slice().sort((a, b) => b - a).indexOf(v) + 1
const rankEff = peringkatDari(kl.map(k => k.medaliPer100Atlet || 0), kb.medaliPer100Atlet)
const rankE100 = peringkatDari(kl.map(k => k.emasPer100Atlet || 0), kb.emasPer100Atlet)
const kabBogor = kl.find(k => k.nama === 'Kab. Bogor'), kotaBogor = kl.find(k => k.nama === 'Kota Bogor'), kel5 = kl.find(k => k.peringkat === 5)
const tanpaMedaliAtlet = D.atlet.resmi - D.atlet.bermedali
const caborNol = D.caborKB.filter(c => c.medali === 0).sort((a, b) => b.atlet - a.atlet)
const atletCaborNol = caborNol.reduce((t, c) => t + c.atlet, 0)
const top3 = D.caborKB.slice(0, 3), emasTop3 = top3.reduce((t, c) => t + c.emas, 0)
const PS = D.persaingan, besar5 = kl.slice(0, 5).map(k => k.nama)
const vs5 = PS.lawan.filter(l => besar5.includes(l.lawan))
const duelLemah = PS.duelCabor.filter(c => c.laga >= 15 && c.persen < 0.45)
const duelKuat = PS.duelCabor.filter(c => c.laga >= 15 && c.persen >= 0.6)
const U = D.umurRingkas, emasMuda = (U['≤17']?.emas || 0) + (U['18–20']?.emas || 0)
const emasHari = Object.entries(D.emasHari).filter(([k]) => k !== '?').sort()
const hariTop = emasHari.slice().sort((a, b) => b[1] - a[1])[0]
const penguasaKB = D.penguasaCabor.filter(c => c.penguasa === 'Kab. Bandung')
const perakTarget = fbEmas.perak || 0

// ── pembentuk paragraf ──────────────────────────────────────────────────
const runs = (teks, opsi = {}) => String(teks).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(b =>
  b.startsWith('**') ? new TextRun({ text: b.slice(2, -2), bold: true, font: FONT, ...opsi }) : new TextRun({ text: b, font: FONT, ...opsi }))
const P = (teks, opsi = {}) => new Paragraph({ children: runs(teks, opsi.run), spacing: { after: 120, line: 288 }, alignment: opsi.align ?? AlignmentType.JUSTIFIED, ...opsi.para })
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })], pageBreakBefore: true })
const H1lanjut = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })] })
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] })
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] })
const B = (teks, lvl = 0) => new Paragraph({ numbering: { reference: 'poin', level: lvl }, children: runs(teks), spacing: { after: 60, line: 276 } })
const N = (teks, ref = 'angka') => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(teks), spacing: { after: 80, line: 276 } })
const Kotak = (judul, baris, warna = 'EAF1F8') => new Table({
  width: { size: LEBAR, type: WidthType.DXA }, columnWidths: [LEBAR],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LEBAR, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: warna, color: 'auto' },
    margins: { top: 140, bottom: 140, left: 200, right: 200 },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: BIRU }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BIRU }, left: { style: BorderStyle.SINGLE, size: 18, color: BIRU }, right: { style: BorderStyle.SINGLE, size: 4, color: BIRU } },
    children: [new Paragraph({ children: [new TextRun({ text: judul, bold: true, font: FONT, color: BIRU })], spacing: { after: 80 } }),
      ...baris.map(b => new Paragraph({ children: runs(b), spacing: { after: 60, line: 276 } }))],
  })] })],
})
const jarak = () => new Paragraph({ children: [], spacing: { after: 80 } })

function tabel(kolom, data, opsi = {}) {
  const lebar = kolom.map(k => k.w)
  const total = lebar.reduce((a, b) => a + b, 0)
  const skala = lebar.map(w => Math.round(w * LEBAR / total)); skala[skala.length - 1] += LEBAR - skala.reduce((a, b) => a + b, 0)
  const batas = { style: BorderStyle.SINGLE, size: 4, color: GARIS }
  const sel = (teks, i, kepala, isi = {}) => new TableCell({
    width: { size: skala[i], type: WidthType.DXA }, margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: kepala ? { type: ShadingType.CLEAR, fill: BIRU, color: 'auto' } : isi.fill ? { type: ShadingType.CLEAR, fill: isi.fill, color: 'auto' } : undefined,
    borders: { top: batas, bottom: batas, left: batas, right: batas },
    children: [new Paragraph({ alignment: kolom[i].kanan ? AlignmentType.RIGHT : kolom[i].tengah ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(teks ?? ''), font: FONT, size: opsi.ukuran ?? 17, bold: kepala || isi.tebal, color: kepala ? 'FFFFFF' : isi.warna })] })],
  })
  return new Table({
    width: { size: LEBAR, type: WidthType.DXA }, columnWidths: skala,
    rows: [new TableRow({ tableHeader: true, children: kolom.map((k, i) => sel(k.h, i, true)) }),
      ...data.map((r, j) => new TableRow({ cantSplit: true, children: r.cells.map((c, i) => sel(c, i, false, { fill: r.fill ?? (j % 2 ? ABU : undefined), tebal: r.tebal, warna: r.warna })) }))],
  })
}
const baris = (cells, x = {}) => ({ cells, ...x })

function gambar(file, judul, lebarPx = 620) {
  const buf = fs.readFileSync(path.join(__dirname, 'grafik', file))
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20)
  return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: lebarPx, height: Math.round(lebarPx * h / w) }, altText: { title: judul, description: judul, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: judul, italics: true, size: 17, font: FONT, color: '555555' })] })]
}

// ── ISI ─────────────────────────────────────────────────────────────────
const isi = []

// Sampul
isi.push(
  new Paragraph({ spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: 'LAPORAN AKHIR', font: FONT, size: 28, bold: true, color: BIRU })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'PORPROV XV JAWA BARAT 2026', font: FONT, size: 48, bold: true })] }),
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: 'Rekap & Analisis Menyeluruh — Versi Kabupaten Bandung', font: FONT, size: 28, color: '444444' })] }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BIRU, space: 1 } }, children: [] }),
  P(`**Hasil akhir Kab. Bandung:** peringkat ${kb.peringkat} dari ${D.ringkas.kontingen} kontingen · ${kb.emas} emas · ${kb.perak} perak · ${kb.perunggu} perunggu (${kb.total} medali) · target KONI ${D.target54Total} emas: **tercapai ${pct(kb.emas / D.target54Total)}**`, { para: { spacing: { before: 240, after: 120 } }, align: AlignmentType.LEFT }),
  P(`Masa pertandingan ${tgl(D.bahan.ringkas.mulai)} – ${tgl(D.bahan.ringkas.selesai)} 2026 · sumber data: arsip seluruh situs panitia porprov.konijabar.or.id (${D.arsip}) dan data aplikasi KONI Kab. Bandung.`, { align: AlignmentType.LEFT }),
  new Paragraph({ spacing: { before: 1800 }, children: [new TextRun({ text: 'DRAF UNTUK DISUNTING — 21 November 2026', font: FONT, bold: true, color: 'C0392B' })] }),
  P('Disusun dari data aplikasi KONI Kab. Bandung (Superadministrator). Setiap angka dapat ditelusuri ke sumbernya; lihat Bab 15 "Catatan Data & Metode".', { align: AlignmentType.LEFT, run: { size: 18, color: '555555' } }),
)

// Daftar isi
isi.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: 'Daftar Isi', font: FONT, size: 32, bold: true })], spacing: { after: 200 } }),
  new TableOfContents('Daftar Isi', { hyperlink: true, headingStyleRange: '1-2' }),
  P('Bila daftar isi kosong: klik kanan di sini → Update Field (atau tekan F9).', { run: { size: 16, color: '888888', italics: true } }))

// RINGKASAN EKSEKUTIF
isi.push(H1('Ringkasan Eksekutif'),
  P(`Kab. Bandung menutup PORPROV XV di **peringkat ${kb.peringkat}** dengan **${kb.emas} emas, ${kb.perak} perak, dan ${kb.perunggu} perunggu** (${kb.total} medali). Seluruh ${D.rekon.jumlah.kita} medali yang disahkan di aplikasi cocok satu per satu dengan podium resmi panitia (${D.rekon.jumlah.berpasangan}/${D.rekon.jumlah.resmi}).`),
  H2('Sepuluh temuan utama'),
  N(`**Target KONI 54 emas terlampaui — ${kb.emas} emas (${pct(kb.emas / D.target54Total)}).** ${tercapai.length} dari ${T54.length} cabor target tercapai (${lewat.length} di antaranya melampaui), ${kurang.length} cabor meleset dengan kekurangan ${kekurangan} emas, tertutup oleh kelebihan ${kelebihan} emas dari cabor lain dan ${emasLuar} emas dari ${luar.length} cabor di luar daftar target.`, 'temuan'),
  N(`**Target berubah empat kali dan terus turun:** ${D.fileB.totalTargetCabor} (target cabor, Juli) → ${D.fileB.totalTargetKoni} (target KONI, Juli) → ${P74.length} (PPT proyeksi, 16 Okt) → ${D.target54Total} (rasionalisasi; dipakai sebagai pembanding di aplikasi sejak 19 Nov). Realisasi ${kb.emas} emas = ${pct(kb.emas / D.fileB.totalTargetCabor)} target cabor dan ${pct(kb.emas / D.fileB.totalTargetKoni)} target KONI awal.`, 'temuan'),
  N(`**Proyeksi per atlet kurang tepat.** Dari ${P74.length} target emas di PPT, ${hit74('emas')} menjadi emas (${pct(hit74('emas') / P74.length)}). Di File B, ${fbTargetEmas} atlet ditarget emas, hanya ${fbEmas.emas || 0} yang meraih emas — sementara ${fbTanpaTargetEmas} atlet di File B yang tidak diberi target justru meraih emas.`, 'temuan'),
  N(`**Tiga cabor andalan menyumbang ${emasTop3} emas (${pct(emasTop3 / kb.emas)}):** ${top3.map(c => `${c.cabor} ${c.emas}`).join(', ')}. Kab. Bandung beremas di ${kb.caborBeremas} cabor dan bermedali di ${kb.caborBermedali} cabor, jadi tidak bergantung pada satu cabor (${kb.caborUtama.nama} = ${pct(kb.caborUtama.porsi)} emas).`, 'temuan'),
  N(`**Efisiensi masih rendah:** ${n(kb.medaliPer100Atlet, 1)} medali dan ${n(kb.emasPer100Atlet, 1)} emas per 100 atlet (peringkat ${rankEff} dan ${rankE100}). Pembanding: Kab. Bogor mengirim ${n(kabBogor.atlet)} atlet dan meraih ${kabBogor.emas} emas; Kota Bogor ${n(kotaBogor.atlet)} atlet → ${kotaBogor.emas} emas.`, 'temuan'),
  N(`**${n(tanpaMedaliAtlet)} dari ${n(D.atlet.resmi)} atlet resmi (${pct(tanpaMedaliAtlet / D.atlet.resmi)}) pulang tanpa medali;** ${atletCaborNol} atlet berada di ${caborNol.length} cabor yang sama sekali tanpa medali (${caborNol.slice(0, 6).map(c => `${c.cabor} ${c.atlet}`).join(', ')}).`, 'temuan'),
  N(`**Rekor laga tanding ${PS.total.menang}–${PS.total.kalah}–${PS.total.seri}** (menang ${pct((PS.total.menang + PS.total.seri / 2) / (PS.total.menang + PS.total.kalah + PS.total.seri))}), tetapi **kalah rekor dari kelima kontingen teratas:** ${vs5.map(l => `${l.lawan} ${l.menang}–${l.kalah}`).join(', ')}.`, 'temuan'),
  N(`**Kab. Bandung menjadi kontingen dengan emas terbanyak di ${penguasaKB.map(c => c.cabor).join(', ') || '—'}** (${penguasaKB.map(c => `${c.kita ? c.kita.emas : 0} dari ${c.emas} emas`).join(', ')}) — satu-satunya cabor yang dipimpin Kab. Bandung.`, 'temuan'),
  N(`**Modal masa depan kuat:** ${emasMuda} dari ${D.atlet.peraihEmas} peraih emas (${pct(emasMuda / D.atlet.peraihEmas)}) berumur 20 tahun ke bawah; ada ${D.bibit.mudaJumlah} atlet bermedali berumur ≤ 20 tahun.`, 'temuan'),
  N(`**${kb.perak} perak adalah peluang terbesar:** ${perakTarget} atlet yang ditarget emas di File B berakhir dengan perak — selisih tipis yang bisa dikejar lewat pembinaan final.`, 'temuan'),
  H2('Rekomendasi inti (rinci di Bab 7)'),
  B('**Satu target, ditetapkan sekali, dipantau terus** — per atlet per nomor, minimal enam bulan sebelum acara; tidak direvisi turun selama pertandingan.'),
  B('**Program konversi perak → emas** dan **Pelatda Bibit Muda** (atlet ≤ 20 tahun yang sudah bermedali).'),
  B('**Seleksi berbasis peluang** untuk menaikkan efisiensi, terutama cabor beregu yang tanpa medali.'),
  B('**Program lawan** khusus menghadapi lima kontingen teratas di cabor tanding yang rekornya kalah.'),
  B('**Satu daftar atlet yang sinkron dengan panitia** — data pendaftaran, verifikasi, dan laporan hasil.'),
)

// BAGIAN I
isi.push(new Paragraph({ pageBreakBefore: true, spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BAGIAN I', font: FONT, size: 28, bold: true, color: BIRU })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'KABUPATEN BANDUNG', font: FONT, size: 44, bold: true })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'Capaian, target, evaluasi strategi, dan usulan pembinaan', font: FONT, size: 24, color: '555555' })] }))

// Bab 1
isi.push(H1('1. Capaian Akhir Kab. Bandung'),
  P(`Kab. Bandung mengirim **${n(D.atlet.resmi)} atlet resmi** (tercatat di daftar panitia) di **${kb.caborDiikuti} cabor**, bertanding dalam ${n(kb.laga)} laga, dan meraih **${kb.total} medali**. ${n(D.atlet.bermedali)} atlet (${pct(D.atlet.bermedali / D.atlet.resmi)}) pulang membawa medali, ${n(D.atlet.peraihEmas)} di antaranya meraih emas.`),
  tabel([{ h: 'Ukuran', w: 5 }, { h: 'Kab. Bandung', w: 2, kanan: true }, { h: 'Keterangan', w: 5 }], [
    baris(['Peringkat klasemen', `${kb.peringkat} / ${D.ringkas.kontingen}`, `Di bawah ${kl.slice(0, 5).map(k => k.nama).join(', ')}`]),
    baris(['Emas / perak / perunggu', `${kb.emas} / ${kb.perak} / ${kb.perunggu}`, `Total ${kb.total} medali`]),
    baris(['Target KONI (rasionalisasi)', `${D.target54Total} emas`, `Tercapai ${pct(kb.emas / D.target54Total)}`], { tebal: true }),
    baris(['Atlet resmi', n(D.atlet.resmi), `${n(D.atlet.kitaVerified)} atlet berstatus Verified/Posted di aplikasi`]),
    baris(['Medali per 100 atlet', n(kb.medaliPer100Atlet, 1), `Peringkat ${rankEff} dari 27`]),
    baris(['Emas per 100 atlet', n(kb.emasPer100Atlet, 1), `Peringkat ${rankE100} dari 27`]),
    baris(['Cabor diikuti / bermedali / beremas', `${kb.caborDiikuti} / ${kb.caborBermedali} / ${kb.caborBeremas}`, '']),
    baris(['Rekor laga tanding (menang–kalah–seri)', `${PS.total.menang}–${PS.total.kalah}–${PS.total.seri}`, `${n(PS.total.menang + PS.total.kalah + PS.total.seri)} laga melawan kontingen lain`]),
    baris(['Jarak ke peringkat 5', `${kel5.emas - kb.emas} emas`, `${kel5.nama}: ${kel5.emas} emas`]),
  ]),
  ...gambar('g10_cabor_kb.png', 'Gambar 1. Medali Kab. Bandung per cabor (15 teratas)'),
  P(`Emas paling banyak diraih pada **${tgl(hariTop[0])} (${hariTop[1]} emas)**, disusul ${emasHari.slice().sort((a, b) => b[1] - a[1]).slice(1, 3).map(([k, v]) => `${tgl(k)} (${v})`).join(' dan ')}.`),
  ...gambar('g4_emas_hari.png', 'Gambar 2. Emas Kab. Bandung per hari (tanggal laporan hasil)'),
)

// Bab 2
isi.push(H1('2. Target 54 Emas: Tercapai dan Terlampaui'),
  P(`Target KONI rasionalisasi berisi **${D.target54Total} emas di ${T54.length} cabor** (berkas "Capaian Medali Emas Porprov XV"; dipakai sebagai pembanding di aplikasi sejak 19 November 2026 — tanggal penetapannya oleh KONI mohon dilengkapi). Hasilnya **${kb.emas} emas**: ${emasDariTarget} dari cabor yang ditargetkan dan ${emasLuar} dari cabor di luar target.`),
  Kotak('Neraca target 54', [
    `Target ${D.target54Total} − kekurangan di ${kurang.length} cabor (${kekurangan} emas) + kelebihan di ${lewat.length} cabor (${kelebihan} emas) = **${emasDariTarget} emas dari cabor target**.`,
    `Ditambah **${emasLuar} emas di luar target** (${luar.map(c => `${c.cabor} ${c.emas}`).join(', ')}) = **${kb.emas} emas**.`,
  ]),
  ...gambar('g2_target54_cabor.png', 'Gambar 3. Target KONI per cabor (abu-abu) dan realisasi emas (hijau = tercapai, merah = meleset)', 560),
  H2('2.1 Cabor yang melampaui target'),
  tabel([{ h: 'Cabor', w: 4 }, { h: 'Target', w: 2, kanan: true }, { h: 'Emas', w: 2, kanan: true }, { h: 'Selisih', w: 2, kanan: true }, { h: 'Perak/Perunggu', w: 3, kanan: true }],
    lewat.sort((a, b) => (b.realisasi - b.emas) - (a.realisasi - a.emas)).map(x => baris([x.cabor, x.emas, x.realisasi, `+${x.realisasi - x.emas}`, `${x.perak} / ${x.perunggu}`]))),
  H2('2.2 Cabor yang meleset'),
  tabel([{ h: 'Cabor', w: 4 }, { h: 'Target', w: 2, kanan: true }, { h: 'Emas', w: 2, kanan: true }, { h: 'Kurang', w: 2, kanan: true }, { h: 'Perak/Perunggu', w: 3, kanan: true }],
    kurang.sort((a, b) => (b.emas - b.realisasi) - (a.emas - a.realisasi)).map(x => baris([x.cabor, x.emas, x.realisasi, `−${x.emas - x.realisasi}`, `${x.perak} / ${x.perunggu}`]))),
  P(`Dari ${kurang.length} cabor yang meleset, ${kurang.filter(x => x.perak > 0).length} cabor tetap meraih perak — Kab. Bandung bersaing di podium, hanya belum menjadi juara. Cabor tanpa medali sama sekali: ${kurang.filter(x => x.perak + x.perunggu + x.realisasi === 0).map(x => x.cabor).join(', ') || '—'}.`),
  H2('2.3 Emas di luar target'),
  P(`${luar.length} cabor yang tidak ada di daftar target menyumbang ${emasLuar} emas: ${luar.map(c => `**${c.cabor}** (${c.emas} emas, ${c.perak} perak, ${c.perunggu} perunggu)`).join(', ')}. Ini menandakan ada potensi yang belum terpetakan saat menyusun target.`),
)

// Bab 3
isi.push(H1('3. Jejak Target & Strategi Awal'),
  P('Sepanjang persiapan ada tiga dokumen target yang menjadi dasar strategi. Ketiganya dibandingkan dengan hasil resmi untuk menilai seberapa tepat perencanaannya.'),
  ...gambar('g1_tangga_target.png', 'Gambar 4. Target emas dari waktu ke waktu dan realisasi'),
  tabel([{ h: 'Dokumen', w: 4 }, { h: 'Waktu', w: 2 }, { h: 'Isi', w: 5 }, { h: 'Target', w: 2, kanan: true }, { h: 'Realisasi', w: 2, kanan: true }], [
    baris(['File B "Analisis Atlet Kab. Bandung 2026" — target cabor', 'diterima Juli 2026', 'Target emas per cabang versi cabor (optimistis)', D.fileB.totalTargetCabor, pct(kb.emas / D.fileB.totalTargetCabor)]),
    baris(['File B — target KONI', 'diterima Juli 2026', 'Target per cabang versi KONI (konservatif) + target medali per atlet', D.fileB.totalTargetKoni, pct(kb.emas / D.fileB.totalTargetKoni)]),
    baris(['PPT "Grafik Raihan Emas"', 'diterima 16 Okt 2026', `${P74.length} target emas bertanggal per atlet/nomor`, P74.length, pct(kb.emas / P74.length)]),
    baris(['Target KONI rasionalisasi', 'dipakai 19 Nov 2026', `${D.target54Total} emas per cabor`, D.target54Total, pct(kb.emas / D.target54Total)], { tebal: true }),
  ]),
  H2('3.1 Hasil 74 target emas di PPT proyeksi'),
  ...gambar('g3_proyeksi74.png', 'Gambar 5. Nasib 74 target emas PPT (dicocokkan ke laporan hasil yang disahkan)'),
  P(`**${hit74('emas')} target menjadi emas, ${hit74('perak')} perak, ${hit74('perunggu')} perunggu, ${hit74('tanpa medali')} tanpa medali, dan ${hit74('tidak ada hasil tercatat')} tidak terlacak** (nama atlet tidak ada di daftar resmi panitia). Artinya ${pct((hit74('emas') + hit74('perak') + hit74('perunggu')) / P74.length)} target tetap menghasilkan medali, tetapi hanya ${pct(hit74('emas') / P74.length)} yang emas. Sebaliknya, ${kb.emas - hit74('emas')} dari ${kb.emas} emas Kab. Bandung datang dari nomor yang tidak ada di PPT. Rincian per baris ada di Lampiran B.`),
  H2('3.2 Target per atlet di File B'),
  P(`File B memuat target medali untuk ${D.fileB.jumlah} atlet. Tabel berikut membandingkan target tiap atlet dengan hasil resminya (dihitung per atlet; atlet nomor beregu dihitung masing-masing).`),
  tabel([{ h: 'Target di File B', w: 3 }, { h: 'Emas', w: 2, kanan: true }, { h: 'Perak', w: 2, kanan: true }, { h: 'Perunggu', w: 2, kanan: true }, { h: 'Tanpa medali', w: 2, kanan: true }, { h: 'Tak tercatat resmi', w: 2, kanan: true }, { h: 'Jumlah', w: 2, kanan: true }],
    ['emas', 'perak', 'perunggu', 'tanpa target'].map(k => { const r = FB[k] || {}; const j = Object.values(r).reduce((a, b) => a + b, 0); return baris([k === 'tanpa target' ? 'Tidak ditarget' : `Target ${k}`, r.emas || 0, r.perak || 0, r.perunggu || 0, r['tanpa medali'] || 0, r['tidak tercatat resmi'] || 0, j], k === 'emas' ? { tebal: true } : {}) })),
  P(`Dari ${fbTargetEmas} atlet yang ditarget emas, **${fbEmas.emas || 0} meraih emas (${pct((fbEmas.emas || 0) / fbTargetEmas)})** dan **${fbEmas.perak || 0} meraih perak** — kelompok terbesar. ${fbTanpaTargetEmas} atlet yang tidak ditarget justru meraih emas. Target File B cenderung terlalu tinggi untuk atlet yang sudah dikenal dan melewatkan atlet yang sedang naik.`),
)

// Bab 4 — kelebihan
isi.push(H1('4. Kelebihan Strategi Awal'),
  N(`**Pilihan cabor andalan tepat.** Tiga cabor dengan target terbesar (Dayung 8, Wushu 5, Gulat 5) semuanya melampaui target dan menyumbang ${emasTop3} emas (${pct(emasTop3 / kb.emas)}). Dayung ${top3[0].emas} emas, Wushu ${top3[1].emas}, Gulat ${top3[2].emas}.`, 'kelebihan'),
  N(`**Target rasionalisasi realistis dan terlampaui.** ${kb.emas} dari ${D.target54Total} emas (${pct(kb.emas / D.target54Total)}); ${tercapai.length} dari ${T54.length} cabor target tercapai.`, 'kelebihan'),
  N(`**Sebaran medali luas, tidak bergantung satu cabor.** Emas datang dari ${kb.caborBeremas} cabor, medali dari ${kb.caborBermedali} cabor; cabor penyumbang terbesar hanya ${pct(kb.caborUtama.porsi)} dari seluruh emas.`, 'kelebihan'),
  N(`**Memimpin Wushu.** Kab. Bandung adalah kontingen dengan emas Wushu terbanyak (${penguasaKB[0] && penguasaKB[0].kita ? `${penguasaKB[0].kita.emas} dari ${penguasaKB[0].emas} emas Wushu` : ''}) dan rekor laga tanding Wushu ${(PS.duelCabor.find(c => c.cabor === 'Wushu') || {}).menang || 0}–${(PS.duelCabor.find(c => c.cabor === 'Wushu') || {}).kalah || 0}.`, 'kelebihan'),
  N(`**Kuat di beberapa cabor tanding:** ${duelKuat.map(c => `${c.cabor} ${c.menang}–${c.kalah} (${pct(c.persen)})`).join(', ')}.`, 'kelebihan'),
  N(`**Regenerasi berjalan.** ${emasMuda} peraih emas berumur ≤ 20 tahun (${pct(emasMuda / D.atlet.peraihEmas)} dari seluruh peraih emas); kelompok ≤ 17 tahun saja menghasilkan ${U['≤17']?.emas || 0} peraih emas.`, 'kelebihan'),
  N(`**Menang telak atas kontingen di bawahnya:** ${PS.lawan.filter(l => l.laga >= 10 && l.persen >= 0.7).map(l => `${l.lawan} ${l.menang}–${l.kalah}`).join(', ')}.`, 'kelebihan'),
  N(`**Pemantauan hasil berjalan rapi.** Seluruh ${D.rekon.jumlah.kita} medali yang disahkan cocok dengan podium resmi panitia; laporan lapangan PIC, Mesin Emas, dan War Room bekerja selama pertandingan.`, 'kelebihan'),
)

// Bab 5 — kekurangan
isi.push(H1('5. Kekurangan Strategi Awal'),
  N(`**Target tidak stabil.** Angka bergerak ${D.fileB.totalTargetCabor} → ${D.fileB.totalTargetKoni} → ${P74.length} → ${D.target54Total}; selama pertandingan tim memakai proyeksi ${P74.length}, dan angka ${D.target54Total} baru dipakai sebagai pembanding di aplikasi pada 19 November, sehari sebelum penutupan. Target yang berganti-ganti dan turun membuat target kurang berfungsi sebagai alat ukur dan alat dorong.`, 'kekurangan'),
  N(`**Proyeksi per atlet kurang tajam.** Hanya ${pct(hit74('emas') / P74.length)} target PPT dan ${pct((fbEmas.emas || 0) / fbTargetEmas)} target emas File B yang benar-benar emas; ${kb.emas - hit74('emas')} emas datang dari luar PPT. Dasar penentuan target (data lawan, catatan waktu/skor, riwayat kejuaraan) perlu diperkuat.`, 'kekurangan'),
  N(`**Efisiensi kontingen rendah.** ${n(kb.medaliPer100Atlet, 1)} medali per 100 atlet, jauh di bawah Kota Bogor (${n(kotaBogor.medaliPer100Atlet, 1)}) dan Kab. Bekasi (${n(kl.find(k => k.nama === 'Kab. Bekasi').medaliPer100Atlet, 1)}). Kab. Bogor dengan jumlah atlet hampir sama (${n(kabBogor.atlet)}) meraih ${kabBogor.emas} emas — dua kali lipat.`, 'kekurangan'),
  N(`**Banyak atlet tanpa peluang medali.** ${n(tanpaMedaliAtlet)} atlet (${pct(tanpaMedaliAtlet / D.atlet.resmi)}) tanpa medali; ${caborNol.length} cabor dengan ${atletCaborNol} atlet tanpa satu pun medali: ${caborNol.map(c => `${c.cabor} (${c.atlet})`).join(', ')}.`, 'kekurangan'),
  N(`**${kurang.length} cabor target meleset (−${kekurangan} emas):** ${kurang.map(x => `${x.cabor} ${x.realisasi}/${x.emas}`).join(', ')}.`, 'kekurangan'),
  N(`**Kalah bersaing dengan lima besar.** Rekor laga tanding melawan ${vs5.map(l => `${l.lawan} ${l.menang}–${l.kalah}`).join(', ')}. Kemenangan Kab. Bandung banyak diraih atas kontingen kecil.`, 'kekurangan'),
  N(`**Cabor tanding dengan rekor kalah:** ${duelLemah.map(c => `${c.cabor} ${c.menang}–${c.kalah}`).join(', ')}.`, 'kekurangan'),
  N(`**Data atlet belum satu.** Saat diperiksa terhadap daftar resmi panitia: 230 atlet Verified/Posted di aplikasi tidak tercatat bertanding, 56 atlet resmi masih berstatus Draft (sudah dibereskan 21 Nov), 40 nama awak beregu belum tercatat di laporan medali (sudah dilengkapi), dan ${D.rekon.atletBeda} laporan medali beregu daftar atletnya berbeda dengan awak resmi.`, 'kekurangan'),
)

// Bab 6 — profil kekuatan
isi.push(H1('6. Profil Kekuatan Kab. Bandung'),
  H2('6.1 Medali per cabor'),
  tabel([{ h: 'Cabor', w: 4 }, { h: 'Atlet', w: 2, kanan: true }, { h: 'Emas', w: 2, kanan: true }, { h: 'Perak', w: 2, kanan: true }, { h: 'Perunggu', w: 2, kanan: true }, { h: 'Medali/atlet', w: 2, kanan: true }],
    D.caborKB.filter(c => c.medali > 0).map(c => baris([c.cabor, c.atlet, c.emas, c.perak, c.perunggu, n(c.medali / Math.max(1, c.atlet), 2)])), { ukuran: 16 }),
  H2('6.2 Persaingan'),
  ...gambar('g7_persaingan.png', 'Gambar 6. Rekor laga tanding vs 10 lawan yang paling sering ditemui'),
  tabel([{ h: 'Cabor tanding', w: 4 }, { h: 'Laga', w: 2, kanan: true }, { h: 'Menang', w: 2, kanan: true }, { h: 'Kalah', w: 2, kanan: true }, { h: 'Seri', w: 2, kanan: true }, { h: '% menang', w: 2, kanan: true }],
    PS.duelCabor.filter(c => c.laga >= 8).map(c => baris([c.cabor, c.laga, c.menang, c.kalah, c.seri, pct(c.persen)], { warna: c.persen < 0.45 ? 'C0392B' : c.persen >= 0.6 ? '1E7B47' : undefined }))),
  P(`Ada ${PS.duelBerulang} pasangan atlet Kab. Bandung yang bertemu lawan yang sama dua kali atau lebih — bahan pengintaian untuk pertemuan berikutnya (tersedia di aplikasi, Rapor Kontingen → Persaingan).`),
  H2('6.3 Umur atlet dan bibit'),
  ...gambar('g8_umur.png', 'Gambar 7. Atlet resmi, bermedali, dan peraih emas Kab. Bandung menurut umur'),
  tabel([{ h: 'Kelompok umur', w: 3 }, { h: 'Atlet resmi', w: 2, kanan: true }, { h: 'Bermedali', w: 2, kanan: true }, { h: '% bermedali', w: 2, kanan: true }, { h: 'Peraih emas', w: 2, kanan: true }],
    ['≤17', '18–20', '21–23', '24–29', '30–35', '≥36'].map(k => { const x = U[k] || { atlet: 0, bermedali: 0, emas: 0 }; return baris([`${k} tahun`, x.atlet, x.bermedali, pct(x.bermedali / Math.max(1, x.atlet)), x.emas]) })),
  P(`Daftar lengkap ${D.bibit.mudaJumlah} atlet bermedali berumur ≤ 20 tahun ada di Lampiran D. Kriteria bibit (Rapor Kontingen → Bibit Atlet): ${Object.entries(D.bibit.kriteriaKB).map(([k, v]) => `${({ multiEmas: 'multi-emas perorangan', juaraPerorangan: 'juara perorangan', takTerkalahkan: 'tak terkalahkan', beruntun: 'menang beruntun', serbaBisa: 'serba bisa' })[k]} ${v}`).join(', ')}.`),
  H2('6.4 Atlet unggulan Kab. Bandung'),
  tabel([{ h: 'Atlet', w: 4 }, { h: 'Cabor', w: 3 }, { h: 'Umur', w: 1, kanan: true }, { h: 'E/P/Pr', w: 2, tengah: true }, { h: 'Emas perorangan', w: 2, kanan: true }, { h: 'Tanding M–K', w: 2, tengah: true }],
    D.bibit.kb.slice(0, 20).map(a => baris([a.nama, a.cabor ?? '', a.umur ?? '—', `${a.emas}/${a.perak}/${a.perunggu}`, a.emasP, a.duelMenang + a.duelKalah ? `${a.duelMenang}–${a.duelKalah}` : '—']))),
)

// Bab 7 — strategy brief
const perakCabor = D.caborKB.filter(c => c.perak > 0).sort((a, b) => b.perak - a.perak).slice(0, 8)
isi.push(H1('7. Usulan Strategy Brief Pembinaan Berikutnya'),
  Kotak('Tujuan yang diusulkan', [
    `Naik dari peringkat ${kb.peringkat} dan memperkecil jarak ke lima besar (selisih ke peringkat 5 saat ini ${kel5.emas - kb.emas} emas), dengan cara **menaikkan efisiensi** — lebih banyak emas dari jumlah atlet yang sama — bukan sekadar menambah jumlah atlet.`,
    `Angka dasar untuk menyusun target berikutnya: **${kb.emas} emas, ${kb.perak} perak, ${kb.perunggu} perunggu; ${n(kb.medaliPer100Atlet, 1)} medali per 100 atlet**.`,
  ]),
  H2('Pilar 1 — Satu target, ditetapkan sekali, dipantau terus'),
  B('Target ditetapkan **per atlet per nomor** paling lambat enam bulan sebelum pertandingan, dengan dasar: hasil PORPROV XV, kejuaraan terakhir, catatan waktu/skor, dan data lawan.'),
  B('Target tidak direvisi turun saat pertandingan berjalan; perubahan dicatat sebagai evaluasi, bukan pengganti target.'),
  B(`Dipantau di War Room aplikasi (Mesin Emas, Misi Emas, Rekonsiliasi) yang sudah terbukti cocok 100% dengan hasil resmi.`),
  H2('Pilar 2 — Konversi perak menjadi emas'),
  P(`Kab. Bandung meraih ${kb.perak} perak; ${perakTarget} atlet yang ditarget emas berakhir perak. Cabor dengan perak terbanyak: ${perakCabor.map(c => `${c.cabor} ${c.perak}`).join(', ')}.`),
  B('Daftar khusus atlet peraih perak sebagai kelompok prioritas — analisis final yang kalah: lawan siapa, selisih berapa, di babak apa.'),
  B('Program persiapan final: simulasi tekanan, strategi pertandingan, dan pengintaian lawan (data duel berulang di aplikasi).'),
  B('Sebagai gambaran: bila satu dari empat perak berubah menjadi emas, tambahannya sekitar ' + Math.round(kb.perak / 4) + ' emas (ilustrasi hitungan, bukan target).'),
  H2('Pilar 3 — Pelatda Bibit Muda'),
  P(`${D.bibit.mudaJumlah} atlet berumur ≤ 20 tahun sudah bermedali, ${D.bibit.mudaEmas} di antaranya emas. Kelompok ini adalah inti kontingen PORPROV berikutnya.`),
  B('Inti pelatda: atlet ≤ 20 tahun dengan emas perorangan, tak terkalahkan, atau menang beruntun (lihat Lampiran D).'),
  B('Pemantauan terukur: tes biomotorik berkala dan target perkembangan per atlet (fitur Tes Biomotorik & Performance di aplikasi).'),
  B('Kejuaraan antara (kejurda/kejurnas) sebagai tolok ukur sebelum target PORPROV ditetapkan.'),
  H2('Pilar 4 — Seleksi berbasis peluang dan efisiensi'),
  B(`Evaluasi ${caborNol.length} cabor tanpa medali (${atletCaborNol} atlet): ${caborNol.slice(0, 6).map(c => c.cabor).join(', ')} — tetap diberangkatkan bila ada rencana pembinaan dan peluang realistis, dengan ukuran yang jelas.`),
  B(`Patokan efisiensi: Kota Bogor ${n(kotaBogor.medaliPer100Atlet, 1)} dan Kab. Bekasi ${n(kl.find(k => k.nama === 'Kab. Bekasi').medaliPer100Atlet, 1)} medali per 100 atlet. Usulan sasaran antara: di atas 35 medali per 100 atlet.`),
  B('Kuota atlet per cabor mengikuti peluang medali dan hasil seleksi, bukan kuota maksimal yang tersedia.'),
  H2('Pilar 5 — Pertahankan andalan, kembangkan potensi baru'),
  B(`Pertahankan: ${top3.map(c => c.cabor).join(', ')} (${emasTop3} emas) serta Wushu sebagai cabor yang dikuasai.`),
  B(`Kembangkan cabor yang melampaui target: ${lewat.filter(x => !top3.find(c => c.cabor === x.cabor)).map(x => x.cabor).join(', ')}.`),
  B(`Petakan potensi baru dari emas di luar target: ${luar.map(c => c.cabor).join(', ')}.`),
  B(`Benahi cabor target yang meleset: ${kurang.map(x => x.cabor).join(', ')} — dimulai dari evaluasi bersama pengurus cabor.`),
  H2('Pilar 6 — Program menghadapi lima besar'),
  B(`Uji tanding terjadwal melawan ${besar5.join(', ')} di cabor tanding.`),
  B(`Prioritas cabor tanding dengan rekor kalah: ${duelLemah.map(c => `${c.cabor} (${c.menang}–${c.kalah})`).join(', ')}.`),
  H2('Pilar 7 — Satu data atlet yang sinkron'),
  B('Satu daftar atlet resmi yang disinkronkan dengan sistem panitia sejak pendaftaran; status Verified hanya untuk atlet yang benar-benar didaftarkan.'),
  B('Laporan hasil PIC wajib mencantumkan seluruh awak beregu; rekonsiliasi otomatis dengan situs panitia (sudah ada di aplikasi).'),
  B('Data pribadi atlet dilindungi (sudah dibenahi 21 Nov 2026: NIK, KK, alamat, rekening, BPJS tidak lagi terbaca publik).'),
  H2('Ukuran keberhasilan yang diusulkan'),
  tabel([{ h: 'Indikator', w: 5 }, { h: 'PORPROV XV', w: 3, kanan: true }, { h: 'Arah', w: 3 }], [
    baris(['Emas', kb.emas, 'naik']),
    baris(['Peringkat klasemen', kb.peringkat, 'naik']),
    baris(['Medali per 100 atlet', n(kb.medaliPer100Atlet, 1), '> 35']),
    baris(['Atlet resmi yang bermedali', pct(D.atlet.bermedali / D.atlet.resmi), 'naik']),
    baris(['Target emas per atlet yang tercapai', pct(hit74('emas') / P74.length), '> 60%']),
    baris(['Rekor tanding vs lima besar', `${vs5.reduce((t, l) => t + l.menang, 0)}–${vs5.reduce((t, l) => t + l.kalah, 0)}`, 'menuju seimbang']),
    baris(['Atlet ≤ 20 tahun bermedali', D.bibit.mudaJumlah, 'dipertahankan/naik']),
  ]),
  H2('Tahapan yang diusulkan'),
  tabel([{ h: 'Tahap', w: 3 }, { h: 'Waktu', w: 3 }, { h: 'Kegiatan utama', w: 8 }], [
    baris(['1. Evaluasi', 'Bulan 0–3', 'Evaluasi per cabor dengan laporan ini; daftar atlet perak & bibit muda; penetapan cabor prioritas.']),
    baris(['2. Seleksi & pelatda', 'Bulan 3–12', 'Seleksi berbasis peluang; pelatda bibit muda; tes biomotorik berkala.']),
    baris(['3. Pembinaan & uji tanding', 'Tahun 2–3', 'Kejuaraan antara; uji tanding vs lima besar; program final.']),
    baris(['4. Penetapan target', '≥ 6 bulan sebelum PORPROV', 'Target per atlet per nomor, dikunci dan dipantau di War Room.']),
  ]),
)

// BAGIAN II
isi.push(new Paragraph({ pageBreakBefore: true, spacing: { before: 3000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BAGIAN II', font: FONT, size: 28, bold: true, color: BIRU })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PORPROV XV SECARA MENYELURUH', font: FONT, size: 40, bold: true })] }))

const R = D.ringkas, BH = D.bahan.ringkas
isi.push(H1('8. Gambaran Penyelenggaraan'),
  tabel([{ h: 'Ukuran', w: 5 }, { h: 'Angka', w: 3, kanan: true }], [
    baris(['Masa pertandingan', `${BH.hari} hari (${tgl(BH.mulai)} – ${tgl(BH.selesai)})`]),
    baris(['Kontingen', R.kontingen]), baris(['Cabang olahraga', R.cabor]), baris(['Nomor pertandingan', n(R.nomor)]),
    baris(['Medali (podium)', n(R.medali)]), baris(['Atlet resmi', n(R.atlet)]),
    baris(['Laga dimainkan / dibatalkan', `${n(BH.laga)} / ${BH.dibatalkan}`]), baris(['Venue', BH.venue]),
  ]),
  ...gambar('g9_beban_hari.png', 'Gambar 8. Beban laga per hari — seluruh PORPROV XV'),
  P(`Hari terpadat ${tgl([...D.bahan.hari].sort((a, b) => b.laga - a.laga)[0].tanggal)} (${n([...D.bahan.hari].sort((a, b) => b.laga - a.laga)[0].laga)} laga); perebutan medali terbanyak ${tgl([...D.bahan.hari].sort((a, b) => b.perebutanMedali - a.perebutanMedali)[0].tanggal)} (${[...D.bahan.hari].sort((a, b) => b.perebutanMedali - a.perebutanMedali)[0].perebutanMedali} laga).`),
)
const e5 = kl.slice(0, 5).reduce((t, k) => t + k.emas, 0), eAll = kl.reduce((t, k) => t + k.emas, 0)
isi.push(H1('9. Klasemen & Perolehan Medali'),
  ...gambar('g5_klasemen.png', 'Gambar 9. Klasemen akhir — 10 besar'),
  P(`Lima kontingen teratas menguasai **${e5} dari ${eAll} emas (${pct(e5 / eAll)})**. Klasemen lengkap ada di Lampiran E.`),
)
isi.push(H1('10. Rapor Kontingen'),
  ...gambar('g6_efisiensi.png', 'Gambar 10. Atlet yang dikirim vs emas yang diraih'),
  tabel([{ h: '#', w: 1, kanan: true }, { h: 'Kontingen', w: 4 }, { h: 'E/P/Pr', w: 3, tengah: true }, { h: 'Atlet', w: 2, kanan: true }, { h: 'Medali/100', w: 2, kanan: true }, { h: 'Emas/100', w: 2, kanan: true }, { h: 'Cabor andalan', w: 4 }],
    kl.map(k => baris([k.peringkat, k.nama, `${k.emas}/${k.perak}/${k.perunggu}`, n(k.atlet), n(k.medaliPer100Atlet, 1), n(k.emasPer100Atlet, 1), k.caborUtama ? `${k.caborUtama.nama} ${k.caborUtama.emas} (${pct(k.caborUtama.porsi)})` : '—'], k.kontingenId === 4 ? { tebal: true, fill: 'DCE8F4' } : {})), { ukuran: 16 }),
)
isi.push(H1('11. Peta Kekuatan Cabor'),
  P(`Penguasa = kontingen dengan emas terbanyak di cabor itu. Label persaingan: porsi emas penguasa ≥ 50% "Dikuasai", 30–50% "Bersaing", < 30% "Merata". Dari ${R.cabor} cabor: ${['Dikuasai', 'Bersaing', 'Merata'].map(l => `${D.penguasaCabor.filter(c => c.persaingan === l).length} ${l.toLowerCase()}`).join(', ')}.`),
  tabel([{ h: 'Cabor', w: 4 }, { h: 'Emas', w: 1, kanan: true }, { h: 'Penguasa', w: 4 }, { h: 'Porsi', w: 2, kanan: true }, { h: 'Persaingan', w: 2 }, { h: 'Kab. Bandung', w: 2, tengah: true }],
    D.penguasaCabor.filter(c => c.emas > 0).map(c => baris([c.cabor, c.emas, c.penguasa ?? '—', pct(c.porsi), c.persaingan, c.kita ? `${c.kita.emas}/${c.kita.perak}/${c.kita.perunggu}` : '—'], c.penguasa === 'Kab. Bandung' ? { tebal: true, fill: 'DCE8F4' } : {})), { ukuran: 15 }),
)
isi.push(H1('12. Atlet Unggulan Se-Jawa Barat'),
  P('Diurutkan menurut emas perorangan, lalu emas, medali perorangan, dan total medali. Medali perorangan = podium berisi satu atlet.'),
  tabel([{ h: 'Atlet', w: 4 }, { h: 'Kontingen', w: 3 }, { h: 'Cabor', w: 3 }, { h: 'E/P/Pr', w: 2, tengah: true }, { h: 'Emas perorangan', w: 2, kanan: true }],
    D.bibit.seJabar.map(a => baris([a.nama, a.kontingen, a.cabor ?? '', `${a.emas}/${a.perak}/${a.perunggu}`, a.emasP], a.kontingenSitusId === kb.situsId ? { tebal: true } : {}))),
)
isi.push(H1('13. Persaingan Antar Kontingen'),
  P(`${n(D.persainganGlobal.laga)} laga tanding mempertemukan dua kontingen (${D.persainganGlobal.seri} seri); ${D.persainganGlobal.duelBerulang} pasangan atlet bertemu lebih dari sekali. Tabel di bawah: rekor menang–kalah kontingen di baris melawan kontingen di kolom (enam besar).`),
  tabel([{ h: 'Kontingen', w: 3 }, ...D.matriks6.map(m => ({ h: m.kontingen.replace('Kab. ', 'Kab.').replace('Kota ', 'Kota '), w: 2, tengah: true }))],
    D.matriks6.map(m => baris([m.kontingen, ...m.lawan.map(l => l ? `${l.menang}–${l.kalah}` : '·')], m.kontingen === 'Kab. Bandung' ? { tebal: true, fill: 'DCE8F4' } : {})), { ukuran: 15 }),
)
isi.push(H1('14. Penyelenggaraan: Venue & Nomor Sepi'),
  H2('14.1 Venue terpadat'),
  tabel([{ h: 'Venue', w: 6 }, { h: 'Laga', w: 2, kanan: true }, { h: 'Hari', w: 1, kanan: true }, { h: 'Puncak/hari', w: 2, kanan: true }],
    D.bahan.venue.slice(0, 12).map(v => baris([v.nama, n(v.laga), v.hari, v.puncak ? `${v.puncak.laga} (${tgl(v.puncak.tanggal)})` : '—']))),
  H2('14.2 Nomor sepi peserta'),
  P(`**${BH.nomorSepi} nomor diikuti 3 peserta atau kurang** — setiap peserta pasti naik podium — dan ${BH.nomorTipis} nomor lagi diikuti 4–5 peserta. Kab. Bandung meraih ${D.bahan.sepiKB?.medaliSepi ?? 0} medali (${D.bahan.sepiKB?.emasSepi ?? 0} emas) dari nomor ≤ 3 peserta, atau ${pct((D.bahan.sepiKB?.medaliSepi ?? 0) / kb.total)} dari seluruh medalinya.`),
  tabel([{ h: 'Kontingen', w: 4 }, { h: 'Medali dari nomor ≤ 3 peserta', w: 3, kanan: true }, { h: 'Emas', w: 2, kanan: true }, { h: '% dari medalinya', w: 3, kanan: true }],
    D.bahan.sepiTop.map(s => baris([s.nama, s.medaliSepi, s.emasSepi, pct(s.medaliSepi / s.medaliTotal)]))),
  P('Bahan evaluasi bagi panitia: kelayakan nomor dengan peserta sangat sedikit, dan bagi kontingen: peluang taktis yang perlu dihitung saat menyusun pendaftaran.'),
)
isi.push(H1('15. Catatan Data & Metode'),
  B(`**Sumber utama:** arsip seluruh situs panitia porprov.konijabar.or.id (22.228 halaman, disalin ${D.arsip}, cadangan di Google Drive), diolah ke database aplikasi.`),
  B('**Pemeriksaan silang:** medali per kontingen = klasemen resmi (27/27); jumlah atlet per kontingen = angka resmi (27/27); 232 medali Kab. Bandung = podium resmi (232/232).'),
  B('**Medali beregu** dihitung satu, sama dengan klasemen resmi. Pada tabel per atlet (File B, umur, bibit), setiap anggota tim dihitung.'),
  B('**Umur** hanya tersedia untuk atlet Kab. Bandung (data atlet aplikasi), dihitung per 20 November 2026. Situs panitia tidak mencantumkan umur.'),
  B('**Rekor tanding** dihitung dari laga tanding (duel) yang selesai dan mempertemukan dua kontingen berbeda; laga tanpa pemenang = seri. Laga peringkat (renang, atletik, dll.) tidak termasuk.'),
  B(`**Pencocokan PPT 74:** per baris dicocokkan ke laporan hasil yang disahkan (cabor sama, nomor sama atau angka kelas/jarak sama, nama atlet cocok); bila atlet meraih medali di nomor lain cabor yang sama (±3 hari), dicatat sebagai hasil dengan keterangan. ${hit74('tidak ada hasil tercatat')} baris tidak terlacak karena namanya tidak ada di daftar resmi.`),
  B('**Target 54** dari berkas "Capaian Medali Emas Porprov XV" (masuk aplikasi 19 Nov 2026); **File B** dari "Analisis Atlet Kabupaten Bandung 2026" (diterima Juli 2026); **PPT** dari "Grafik Raihan Emas" (diterima 16 Okt 2026). Tanggal penetapan resmi oleh KONI belum tercatat di sumber ini.'),
  B('**Keterbatasan:** data anggaran, ofisial, dan riwayat PORPROV sebelumnya tidak tersedia di sumber ini, sehingga tidak dibahas.'),
)

// LAMPIRAN
isi.push(H1('Lampiran A. Target 54 Emas per Cabor'),
  tabel([{ h: 'Cabor', w: 4 }, { h: 'Target', w: 2, kanan: true }, { h: 'Emas', w: 2, kanan: true }, { h: 'Perak', w: 2, kanan: true }, { h: 'Perunggu', w: 2, kanan: true }, { h: 'Status', w: 3 }],
    [...T54.map(x => baris([x.cabor, x.emas, x.realisasi, x.perak, x.perunggu, x.realisasi > x.emas ? 'Melampaui' : x.realisasi === x.emas ? 'Tercapai' : 'Meleset'], { warna: x.realisasi < x.emas ? 'C0392B' : undefined })),
      ...luar.map(c => baris([c.cabor, 0, c.emas, c.perak, c.perunggu, 'Di luar target'])),
      baris(['Jumlah', D.target54Total, kb.emas, '', '', ''], { tebal: true, fill: 'DCE8F4' })]),
)
isi.push(H1('Lampiran B. 74 Target Emas PPT dan Hasilnya'),
  tabel([{ h: '#', w: 1, kanan: true }, { h: 'Tgl', w: 1.5 }, { h: 'Cabor', w: 2.5 }, { h: 'Nomor', w: 4 }, { h: 'Atlet', w: 4 }, { h: 'Hasil', w: 2 }, { h: 'Catatan', w: 4 }],
    P74.map(p => baris([p.urutan, tgl(p.tanggal), p.cabor, p.nomor, p.atlet, p.hasil === 'tidak ada hasil tercatat' ? 'tak terlacak' : p.hasil, p.catatan], { warna: p.hasil === 'emas' ? '8A6D00' : undefined })), { ukuran: 14 }),
)
isi.push(H1('Lampiran C. 232 Medali Kab. Bandung'),
  tabel([{ h: 'Medali', w: 2 }, { h: 'Cabor', w: 3 }, { h: 'Nomor', w: 5 }, { h: 'Tgl', w: 1.5 }, { h: 'Atlet', w: 6 }],
    D.medaliList.map(m => baris([m.hasil, m.cabor, m.nomor, tgl(m.tanggal), m.atlet.length > 6 ? `${m.atlet.slice(0, 6).join(', ')} +${m.atlet.length - 6}` : m.atlet.join(', ')])), { ukuran: 14 }),
)
isi.push(H1(`Lampiran D. Bibit Muda Kab. Bandung (≤ 20 tahun, bermedali)`),
  tabel([{ h: 'Atlet', w: 4 }, { h: 'Cabor', w: 3 }, { h: 'Umur', w: 1, kanan: true }, { h: 'E/P/Pr', w: 2, tengah: true }, { h: 'Perorangan', w: 2, tengah: true }, { h: 'Kriteria', w: 5 }],
    D.bibit.muda.filter(a => a.total > 0).map(a => baris([a.nama, a.cabor ?? '', a.umur, `${a.emas}/${a.perak}/${a.perunggu}`, `${a.emasP}/${a.perakP}/${a.perungguP}`, a.kriteria.map(k => ({ multiEmas: 'multi-emas', juaraPerorangan: 'juara perorangan', takTerkalahkan: 'tak terkalahkan', beruntun: 'beruntun', serbaBisa: 'serba bisa' })[k]).join(', ')])), { ukuran: 14 }),
)
isi.push(H1('Lampiran E. Klasemen Akhir 27 Kontingen'),
  tabel([{ h: '#', w: 1, kanan: true }, { h: 'Kontingen', w: 5 }, { h: 'Emas', w: 2, kanan: true }, { h: 'Perak', w: 2, kanan: true }, { h: 'Perunggu', w: 2, kanan: true }, { h: 'Total', w: 2, kanan: true }, { h: 'Atlet', w: 2, kanan: true }],
    kl.map(k => baris([k.peringkat, k.nama, k.emas, k.perak, k.perunggu, k.total, n(k.atlet)], k.kontingenId === 4 ? { tebal: true, fill: 'DCE8F4' } : {}))),
)

// ── Dokumen ─────────────────────────────────────────────────────────────
const doc = new Document({
  creator: 'Superadministrator', title: 'Laporan Akhir PORPROV XV — Versi Kab. Bandung', description: 'Rekap & analisis menyeluruh PORPROV XV Jawa Barat 2026',
  features: { updateFields: true },
  styles: {
    default: { document: { run: { font: FONT, size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: BIRU }, paragraph: { spacing: { before: 240, after: 180 }, keepNext: true, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 25, bold: true, color: '222222' }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true }, paragraph: { spacing: { before: 180, after: 80 }, keepNext: true, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [
    { reference: 'poin', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }, { level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 270 } } } }] },
    ...['angka', 'temuan', 'kelebihan', 'kekurangan'].map(r => ({ reference: r, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] })),
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 567, footer: 567 } }, titlePage: true },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Laporan Akhir PORPROV XV — Versi Kab. Bandung · DRAF', font: FONT, size: 16, color: '888888' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Halaman ', PageNumber.CURRENT, ' dari ', PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '888888' })] })] }) },
    children: isi,
  }],
})
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(KELUAR, buf); console.log('✓', KELUAR, Math.round(buf.length / 1024) + ' KB') })
