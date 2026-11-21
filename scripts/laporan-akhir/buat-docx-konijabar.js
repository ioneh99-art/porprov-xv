// Membuat "Laporan Akhir PORPROV XV — Versi KONI Jabar" (.docx, netral) dari data-konijabar.json + grafik-kj/*.png
const fs = require('fs')
const path = require('path')
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType,
  ShadingType, BorderStyle, ImageRun, Header, Footer, PageNumber, TableOfContents, LevelFormat,
} = require('docx')

const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'data-konijabar.json'), 'utf8'))
const KELUAR = process.argv[2] || path.join(__dirname, 'Laporan_KONIJabar.docx')
const LEBAR = 9638, FONT = 'Arial', BIRU = '1F4E79', ABU = 'F2F4F7', GARIS = 'C9D3DE'

const n = (x, d = 0) => (x == null ? '—' : Number(x).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }))
const pct = (x, d = 0) => (x == null || !isFinite(x) ? '—' : `${n(x * 100, d)}%`)
const tgl = s => { if (!s) return '—'; const b = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']; const [, m, d] = s.split('-'); return `${Number(d)} ${b[Number(m)]}` }
const KRIT = { multiEmas: 'multi-emas perorangan', juaraPerorangan: 'juara perorangan', takTerkalahkan: 'tak terkalahkan', beruntun: 'menang beruntun', serbaBisa: 'serba bisa' }

// ── angka bantu ──
const R = D.ringkas, BH = D.bahan.ringkas, K = D.klasemen, J = D.jumlahJenis
const totalEmas = K.reduce((t, k) => t + k.emas, 0)
const e5 = K.slice(0, 5).reduce((t, k) => t + k.emas, 0), e10 = K.slice(0, 10).reduce((t, k) => t + k.emas, 0)
const effUrut = K.slice().sort((a, b) => (b.medaliPer100Atlet || 0) - (a.medaliPer100Atlet || 0))
const efTop = effUrut[0], efBawah = effUrut[effUrut.length - 1]
const lbl = l => D.cabor.filter(c => c.persaingan === l)
const dikuasai = lbl('Dikuasai'), bersaing = lbl('Bersaing'), merata = lbl('Merata')
const hariPuncak = D.bahan.hari.slice().sort((a, b) => b.laga - a.laga)[0], hariMedali = D.bahan.hari.slice().sort((a, b) => b.perebutanMedali - a.perebutanMedali)[0]
const sepiCab = Object.entries(D.bahan.sepiPerCabor).sort((a, b) => b[1] - a[1])
const tergantung = K.filter(k => k.tergantung)
const porsiTinggi = K.filter(k => k.caborUtama && k.emas >= 3 && k.caborUtama.porsi >= 0.4)
const kotaEmasDuel = D.profil.map(p => ({ nama: p.nama, ...p.rekor.total, laga: p.rekor.total.menang + p.rekor.total.kalah + p.rekor.total.seri })).filter(x => x.laga >= 50)
const duelTop = kotaEmasDuel.slice().sort((a, b) => ((b.menang + b.seri / 2) / b.laga) - ((a.menang + a.seri / 2) / a.laga))[0]
const kontingenSemuaEmas = K.filter(k => k.emas > 0).length
const kuasaiPerK = {}; D.cabor.forEach(c => { if (c.penguasa) kuasaiPerK[c.penguasa.nama] = (kuasaiPerK[c.penguasa.nama] || 0) + 1 })
const kuasaiTop = Object.entries(kuasaiPerK).sort((a, b) => b[1] - a[1]).slice(0, 5)

// ── pembentuk ──
const runs = (teks, opsi = {}) => String(teks).split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(b =>
  b.startsWith('**') ? new TextRun({ text: b.slice(2, -2), bold: true, font: FONT, ...opsi }) : new TextRun({ text: b, font: FONT, ...opsi }))
const P = (teks, opsi = {}) => new Paragraph({ children: runs(teks, opsi.run), spacing: { after: 120, line: 288 }, alignment: opsi.align ?? AlignmentType.JUSTIFIED, ...opsi.para })
const H1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: FONT })], pageBreakBefore: true })
const H2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t, font: FONT })] })
const H3 = t => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t, font: FONT })] })
const B = teks => new Paragraph({ numbering: { reference: 'poin', level: 0 }, children: runs(teks), spacing: { after: 60, line: 276 } })
const N = (teks, ref) => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(teks), spacing: { after: 80, line: 276 } })
const Kotak = (judul, baris) => new Table({
  width: { size: LEBAR, type: WidthType.DXA }, columnWidths: [LEBAR],
  rows: [new TableRow({ children: [new TableCell({
    width: { size: LEBAR, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: 'EAF1F8', color: 'auto' }, margins: { top: 140, bottom: 140, left: 200, right: 200 },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: BIRU }, bottom: { style: BorderStyle.SINGLE, size: 4, color: BIRU }, left: { style: BorderStyle.SINGLE, size: 18, color: BIRU }, right: { style: BorderStyle.SINGLE, size: 4, color: BIRU } },
    children: [new Paragraph({ children: [new TextRun({ text: judul, bold: true, font: FONT, color: BIRU })], spacing: { after: 80 } }), ...baris.map(b => new Paragraph({ children: runs(b), spacing: { after: 60, line: 276 } }))],
  })] })],
})
function tabel(kolom, data, opsi = {}) {
  const lebar = kolom.map(k => k.w), total = lebar.reduce((a, b) => a + b, 0)
  const skala = lebar.map(w => Math.round(w * LEBAR / total)); skala[skala.length - 1] += LEBAR - skala.reduce((a, b) => a + b, 0)
  const batas = { style: BorderStyle.SINGLE, size: 4, color: GARIS }
  const sel = (teks, i, kepala, isi = {}) => new TableCell({
    width: { size: skala[i], type: WidthType.DXA }, margins: { top: 45, bottom: 45, left: 80, right: 80 },
    shading: kepala ? { type: ShadingType.CLEAR, fill: BIRU, color: 'auto' } : isi.fill ? { type: ShadingType.CLEAR, fill: isi.fill, color: 'auto' } : undefined,
    borders: { top: batas, bottom: batas, left: batas, right: batas },
    children: [new Paragraph({ alignment: kolom[i].kanan ? AlignmentType.RIGHT : kolom[i].tengah ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(teks ?? ''), font: FONT, size: opsi.ukuran ?? 17, bold: kepala || isi.tebal, color: kepala ? 'FFFFFF' : isi.warna })] })],
  })
  return new Table({ width: { size: LEBAR, type: WidthType.DXA }, columnWidths: skala,
    rows: [new TableRow({ tableHeader: true, children: kolom.map((k, i) => sel(k.h, i, true)) }),
      ...data.map((r, j) => new TableRow({ cantSplit: true, children: r.cells.map((c, i) => sel(c, i, false, { fill: r.fill ?? (j % 2 ? ABU : undefined), tebal: r.tebal, warna: r.warna })) }))] })
}
const baris = (cells, x = {}) => ({ cells, ...x })
function gambar(file, judul, lebarPx = 620) {
  const buf = fs.readFileSync(path.join(__dirname, 'grafik-kj', file)), w = buf.readUInt32BE(16), h = buf.readUInt32BE(20)
  return [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 40 }, children: [new ImageRun({ type: 'png', data: buf, transformation: { width: lebarPx, height: Math.round(lebarPx * h / w) }, altText: { title: judul, description: judul, name: file } })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: judul, italics: true, size: 17, font: FONT, color: '555555' })] })]
}

// ── ISI ──
const isi = []
isi.push(
  new Paragraph({ spacing: { before: 2400, after: 200 }, children: [new TextRun({ text: 'LAPORAN AKHIR', font: FONT, size: 28, bold: true, color: BIRU })] }),
  new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'PORPROV XV JAWA BARAT 2026', font: FONT, size: 48, bold: true })] }),
  new Paragraph({ spacing: { after: 600 }, children: [new TextRun({ text: 'Rekap & Analisis Menyeluruh — Versi KONI Jawa Barat', font: FONT, size: 28, color: '444444' })] }),
  new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BIRU, space: 1 } }, children: [] }),
  P(`${R.kontingen} kontingen · ${R.cabor} cabang olahraga · ${n(R.nomor)} nomor · ${n(R.atlet)} atlet · ${n(BH.laga)} laga dalam ${BH.hari} hari (${tgl(BH.mulai)} – ${tgl(BH.selesai)} 2026) · juara umum **${K[0].nama}** (${K[0].emas} emas).`, { para: { spacing: { before: 240, after: 120 } }, align: AlignmentType.LEFT }),
  P(`Sumber data: arsip seluruh situs panitia porprov.konijabar.or.id (disalin ${D.arsip}), diperiksa silang dengan klasemen resmi.`, { align: AlignmentType.LEFT }),
  new Paragraph({ spacing: { before: 1800 }, children: [new TextRun({ text: 'DRAF UNTUK DISUNTING — 21 November 2026', font: FONT, bold: true, color: 'C0392B' })] }),
  P('Disusun dari gudang data PORPROV XV (Superadministrator). Setiap angka dapat ditelusuri ke sumbernya; lihat Bab 9 "Catatan Data & Metode".', { align: AlignmentType.LEFT, run: { size: 18, color: '555555' } }),
)
isi.push(new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: 'Daftar Isi', font: FONT, size: 32, bold: true })], spacing: { after: 200 } }),
  new TableOfContents('Daftar Isi', { hyperlink: true, headingStyleRange: '1-2' }),
  P('Bila daftar isi kosong: klik kanan di sini → Update Field (atau tekan F9).', { run: { size: 16, color: '888888', italics: true } }))

// Ringkasan
isi.push(H1('Ringkasan Eksekutif'),
  P(`PORPROV XV Jawa Barat 2026 mempertandingkan **${n(R.nomor)} nomor di ${R.cabor} cabang olahraga** selama ${BH.hari} hari, diikuti **${n(R.atlet)} atlet dari ${R.kontingen} kontingen**. **${K[0].nama}** menjadi juara umum dengan ${K[0].emas} emas, disusul ${K.slice(1, 5).map(k => `${k.nama} (${k.emas})`).join(', ')}.`),
  H2('Sepuluh temuan utama'),
  N(`**Prestasi sangat terkonsentrasi.** Lima besar meraih ${e5} dari ${totalEmas} emas (${pct(e5 / totalEmas)}); sepuluh besar ${pct(e10 / totalEmas)}. Seluruh ${kontingenSemuaEmas} kontingen meraih minimal satu emas.`, 'temuan'),
  N(`**Efisiensi kontingen sangat beragam:** dari ${n(efTop.medaliPer100Atlet, 1)} medali per 100 atlet (${efTop.nama}) hingga ${n(efBawah.medaliPer100Atlet, 1)} (${efBawah.nama}). Jumlah atlet bukan penentu tunggal — ${K.find(k => k.nama === 'Kota Bogor')?.nama ?? ''} dengan ${n(K.find(k => k.nama === 'Kota Bogor')?.atlet)} atlet meraih ${K.find(k => k.nama === 'Kota Bogor')?.emas} emas.`, 'temuan'),
  N(`**${dikuasai.length} dari ${R.cabor} cabor dikuasai satu kontingen** (≥ 50% emasnya), ${bersaing.length} bersaing, dan ${merata.length} merata. Kontingen yang paling banyak memimpin cabor: ${kuasaiTop.map(([k, v]) => `${k} (${v})`).join(', ')}.`, 'temuan'),
  N(`**${BH.nomorSepi} nomor hanya diikuti 3 peserta atau kurang** — setiap peserta pasti naik podium — dan ${BH.nomorTipis} nomor lagi diikuti 4–5 peserta. Terbanyak di ${sepiCab.slice(0, 5).map(([c, v]) => `${c} (${v})`).join(', ')}.`, 'temuan'),
  N(`**Beban jadwal menumpuk di beberapa hari:** ${tgl(hariPuncak.tanggal)} mencatat ${n(hariPuncak.laga)} laga/partai di ${hariPuncak.venue} venue; perebutan medali terbanyak ${tgl(hariMedali.tanggal)} (${hariMedali.perebutanMedali} laga) di ${hariMedali.venue} venue.`, 'temuan'),
  N(`**${BH.dibatalkan} laga dibatalkan**, dan ${D.nomorTanpaPerak} nomor tanpa peraih perak; ${D.nomorDuaPerunggu} nomor memberikan dua perunggu (sistem gugur), sehingga perunggu (${n(J.perunggu)}) jauh lebih banyak daripada emas (${n(J.emas)}).`, 'temuan'),
  N(`**Rivalitas utama** — pasangan yang paling sering bertemu di laga tanding: ${D.rivalitas.slice(0, 3).map(r => `${r.a} vs ${r.b} ${r.menang}–${r.kalah}${r.seri ? `–${r.seri}` : ''}`).join('; ')}. Kota Bekasi dan Kota Bandung bertemu ${D.rivalitas[0].laga} kali dengan hasil hampir seimbang (dari ${n(D.persainganGlobal.laga)} laga tanding antar kontingen).`, 'temuan'),
  N(`**Ketergantungan pada satu cabor rendah** di sebagian besar kontingen; hanya ${tergantung.map(k => `${k.nama} (${pct(k.caborUtama.porsi)} emas dari ${k.caborUtama.nama})`).join(', ') || 'tidak ada'} yang lebih dari separuh emasnya dari satu cabor.`, 'temuan'),
  N(`**Atlet unggulan se-Jabar:** ${D.bibitKriteria.multiEmas || 0} atlet meraih dua emas perorangan atau lebih, ${D.bibitKriteria.takTerkalahkan || 0} tak terkalahkan di laga tanding perorangan, ${D.bibitKriteria.beruntun || 0} menang beruntun ≥ 4 kali — bahan seleksi pelatda.`, 'temuan'),
  N(`**Data penyelenggaraan lengkap dan konsisten** (medali per kontingen = klasemen resmi 27/27), tetapi situs **tidak mencantumkan umur atlet** dan **memotong daftar awak beregu di podium pada 8 nama** — dua hal yang membatasi analisis pembinaan.`, 'temuan'),
  H2('Rekomendasi inti (rinci di Bab 10)'),
  B('**Batas minimal peserta per nomor** dan evaluasi nomor dengan ≤ 3 peserta.'),
  B('**Pemerataan jadwal dan venue** pada hari-hari puncak.'),
  B('**Program pemerataan prestasi** bagi kontingen di luar sepuluh besar.'),
  B('**Standar data terbuka**: umur/tahun lahir atlet, daftar awak lengkap, arsip permanen.'),
  B('**Daftar atlet unggulan** sebagai bahan seleksi pelatda Jawa Barat.'),
)

// Bab 1
isi.push(H1('1. Gambaran Penyelenggaraan'),
  tabel([{ h: 'Ukuran', w: 5 }, { h: 'Angka', w: 4, kanan: true }], [
    baris(['Masa pertandingan', `${BH.hari} hari (${tgl(BH.mulai)} – ${tgl(BH.selesai)})`]), baris(['Kontingen', R.kontingen]), baris(['Cabang olahraga', R.cabor]),
    baris(['Nomor pertandingan', n(R.nomor)]), baris(['Atlet resmi', n(R.atlet)]),
    baris(['Medali: emas / perak / perunggu', `${n(J.emas)} / ${n(J.perak)} / ${n(J.perunggu)}`]),
    baris(['Laga dimainkan / dibatalkan', `${n(BH.laga)} / ${BH.dibatalkan}`]), baris(['Venue dipakai', BH.venue]),
    baris(['Laga tanding antar kontingen (duel)', n(D.persainganGlobal.laga)]),
  ]),
  ...gambar('k5_beban_hari.png', 'Gambar 1. Beban pertandingan per hari'),
  P(`Hari terpadat ${tgl(hariPuncak.tanggal)} (${n(hariPuncak.laga)} laga/partai, ${hariPuncak.cabor} cabor, ${hariPuncak.venue} venue). Perebutan medali terbanyak ${tgl(hariMedali.tanggal)} (${hariMedali.perebutanMedali} laga, ${hariMedali.cabor} cabor). Catatan: situs panitia menghitung setiap partai sebagai satu laga, sehingga cabor dengan banyak partai singkat (catur, anggar, petanque) menaikkan angka harian.`),
)
// Bab 2
isi.push(H1('2. Klasemen & Perolehan Medali'),
  ...gambar('k1_klasemen.png', 'Gambar 2. Klasemen akhir 27 kontingen', 560),
  ...gambar('k4_konsentrasi.png', 'Gambar 3. Sebaran emas menurut kelompok peringkat'),
  P(`Lima besar meraih ${pct(e5 / totalEmas)} emas. Jarak juara umum ke peringkat kedua ${K[0].emas - K[1].emas} emas; jarak peringkat 5 ke peringkat 6 ${K[4].emas - K[5].emas} emas — celah terbesar di papan atas klasemen.`),
)
// Bab 3
isi.push(H1('3. Rapor Kontingen'),
  P('Efisiensi = medali per 100 atlet yang dikirim. Rekor tanding = laga duel melawan kontingen lain (menang–kalah–seri). Cabor andalan = penyumbang emas terbesar beserta porsinya dari seluruh emas kontingen.'),
  ...gambar('k2_efisiensi.png', 'Gambar 4. Atlet yang dikirim vs emas yang diraih'),
  ...gambar('k3_efisiensi_bar.png', 'Gambar 5. Medali per 100 atlet', 560),
  tabel([{ h: '#', w: 0.8, kanan: true }, { h: 'Kontingen', w: 3.5 }, { h: 'E/P/Pr', w: 2.6, tengah: true }, { h: 'Atlet', w: 1.5, kanan: true }, { h: 'Medali /100', w: 1.6, kanan: true }, { h: 'Emas /100', w: 1.5, kanan: true }, { h: 'Rekor tanding', w: 2.4, tengah: true }, { h: 'Cabor andalan', w: 3.6 }],
    D.profil.map(k => baris([k.peringkat, k.nama, `${k.emas}/${k.perak}/${k.perunggu}`, n(k.atlet), n(k.medaliPer100Atlet, 1), n(k.emasPer100Atlet, 1), `${k.rekor.total.menang}–${k.rekor.total.kalah}${k.rekor.total.seri ? `–${k.rekor.total.seri}` : ''}`, k.caborUtama ? `${k.caborUtama.nama} ${k.caborUtama.emas} (${pct(k.caborUtama.porsi)})` : '—'])), { ukuran: 15 }),
  H2('Ketergantungan pada satu cabor'),
  P(`Kontingen dengan porsi emas ≥ 40% dari satu cabor (minimal 3 emas): ${porsiTinggi.map(k => `**${k.nama}** — ${k.caborUtama.nama} ${k.caborUtama.emas}/${k.emas} (${pct(k.caborUtama.porsi)})`).join('; ') || 'tidak ada'}. Kontingen seperti ini rawan bila cabor andalannya tidak dipertandingkan atau melemah.`),
)
// Bab 4 Profil
isi.push(H1('4. Profil 27 Kontingen'), P('Ringkasan setiap kontingen: posisi, efisiensi, cabor andalan, cabor yang dipimpin, rekor tanding, lawan terberat, dan atlet unggulan.'))
D.profil.forEach(k => {
  const r = k.rekor
  isi.push(H2(`${k.peringkat}. ${k.nama}`),
    P(`**${k.emas} emas, ${k.perak} perak, ${k.perunggu} perunggu** (${k.total} medali) dari ${n(k.atlet)} atlet resmi di ${k.caborDiikuti} cabor — ${n(k.medaliPer100Atlet, 1)} medali dan ${n(k.emasPer100Atlet, 1)} emas per 100 atlet; beremas di ${k.caborBeremas} cabor, bermedali di ${k.caborBermedali} cabor.`),
    P(`**Cabor andalan:** ${k.top.map(t => `${t.cabor} ${t.emas}/${t.perak}/${t.perunggu}`).join(', ') || '—'}.${k.kuasai.length ? ` **Memimpin** (emas terbanyak) di: ${k.kuasai.join(', ')}.` : ''}`),
    P(`**Rekor tanding:** ${r.total.menang}–${r.total.kalah}${r.total.seri ? `–${r.total.seri}` : ''}${r.terberat ? `; lawan terberat ${r.terberat.lawan} (${r.terberat.menang}–${r.terberat.kalah})` : ''}${r.terkuasai ? `; ${(r.terkuasai.persen ?? 0) > 0.5 ? 'paling unggul atas' : 'rekor terbaik melawan'} ${r.terkuasai.lawan} (${r.terkuasai.menang}–${r.terkuasai.kalah})` : ''}.${k.sepi ? ` Medali dari nomor ≤ 3 peserta: ${k.sepi.medaliSepi} (${k.sepi.emasSepi} emas).` : ''}`),
    P(`**Atlet unggulan:** ${k.bibit.map(a => `${a.nama} (${a.cabor ?? '—'}, ${a.emas} emas${a.emasP ? `, ${a.emasP} perorangan` : ''})`).join('; ') || '—'}.`))
})
// Bab 5 cabor
isi.push(H1('5. Peta Kekuatan Cabor'),
  P(`Penguasa = kontingen dengan emas terbanyak di cabor itu. Porsi emas penguasa ≥ 50% "Dikuasai", 30–50% "Bersaing", < 30% "Merata". Hasil: **${dikuasai.length} dikuasai, ${bersaing.length} bersaing, ${merata.length} merata**.`),
  ...gambar('k7_peta.png', 'Gambar 6. Emas sepuluh besar di 18 cabor dengan emas terbanyak'),
  tabel([{ h: 'Cabor', w: 4 }, { h: 'Nomor', w: 1.4, kanan: true }, { h: 'Emas', w: 1.3, kanan: true }, { h: 'Penguasa', w: 3.6 }, { h: 'Porsi', w: 1.5, kanan: true }, { h: 'Kontingen beremas', w: 2, kanan: true }, { h: 'Persaingan', w: 2 }],
    D.cabor.filter(c => c.emas > 0).map(c => baris([c.nama, c.nomor, c.emas, c.penguasa ? `${c.penguasa.nama} (${c.penguasa.emas})` : '—', pct(c.penguasa?.porsiEmas), `${c.kontingenBeremas} / ${c.kontingenIkut}`, c.persaingan])), { ukuran: 15 }),
)
// Bab 6 atlet
isi.push(H1('6. Atlet Unggulan Se-Jawa Barat'),
  P(`Situs panitia tidak mencantumkan umur, sehingga atlet unggulan dinilai dari **prestasi**: emas perorangan → emas → medali perorangan → total medali → tingkat menang. Medali perorangan = podium satu atlet; menang–kalah dan menang beruntun hanya dari laga tanding perorangan. Dari ${n(D.bibitJumlah)} kandidat: ${Object.entries(D.bibitKriteria).map(([k, v]) => `${KRIT[k]} ${v}`).join(', ')}.`),
  tabel([{ h: '#', w: 0.7, kanan: true }, { h: 'Atlet', w: 4 }, { h: 'Kontingen', w: 3 }, { h: 'Cabor', w: 3 }, { h: 'E/P/Pr', w: 2, tengah: true }, { h: 'Perorangan', w: 2, tengah: true }],
    D.bibitTop.map((a, i) => baris([i + 1, a.nama, a.kontingen, a.cabor ?? '', `${a.emas}/${a.perak}/${a.perunggu}`, `${a.emasP}/${a.perakP}/${a.perungguP}`])), { ukuran: 15 }),
  H2('Menang beruntun terpanjang (laga tanding perorangan)'),
  tabel([{ h: 'Atlet', w: 4 }, { h: 'Kontingen', w: 3 }, { h: 'Cabor', w: 3 }, { h: 'Beruntun', w: 2, kanan: true }, { h: 'Menang–kalah', w: 2, tengah: true }],
    D.beruntunTop.map(a => baris([a.nama, a.kontingen, a.cabor ?? '', a.beruntun, `${a.duelMenang}–${a.duelKalah}`]))),
)
// Bab 7 persaingan
isi.push(H1('7. Persaingan Antar Kontingen'),
  P(`${n(D.persainganGlobal.laga)} laga tanding (duel) mempertemukan dua kontingen; ${D.persainganGlobal.seri} berakhir tanpa pemenang (seri). ${D.persainganGlobal.duelBerulang} pasangan atlet bertemu lebih dari sekali.`),
  H2('Rivalitas dengan pertemuan terbanyak'),
  tabel([{ h: 'Kontingen A', w: 3 }, { h: 'Kontingen B', w: 3 }, { h: 'Laga', w: 1.5, kanan: true }, { h: 'A menang–kalah–seri', w: 3, tengah: true }, { h: '% A', w: 1.5, kanan: true }],
    D.rivalitas.map(r => baris([r.a, r.b, r.laga, `${r.menang}–${r.kalah}–${r.seri}`, pct(r.persenA)]))),
  H2('Matriks sepuluh besar'),
  P('Rekor menang–kalah kontingen di baris melawan kontingen di kolom (nomor kolom = urutan baris).'),
  tabel([{ h: 'Kontingen', w: 3.2 }, ...D.matriks10.map((m, i) => ({ h: String(i + 1), w: 1.1, tengah: true }))],
    D.matriks10.map((m, i) => baris([`${i + 1}. ${m.kontingen}`, ...m.lawan.map(l => l ? `${l.menang}–${l.kalah}` : '·')])), { ukuran: 14 }),
)
// Bab 8 penyelenggaraan
isi.push(H1('8. Penyelenggaraan: Venue & Nomor Sepi'),
  H2('8.1 Venue dengan partai terbanyak'),
  P('Situs panitia mencatat **setiap partai sebagai satu laga**, sehingga venue cabor dengan banyak partai singkat (catur, anggar, petanque, judo, sambo) memiliki angka sangat tinggi. Angka ini menunjukkan jumlah partai, bukan beban venue yang setara antar cabor.'),
  tabel([{ h: 'Venue', w: 5 }, { h: 'Cabor', w: 3.2 }, { h: 'Partai', w: 1.4, kanan: true }, { h: 'Hari', w: 1, kanan: true }, { h: 'Puncak/hari', w: 2, kanan: true }],
    D.bahan.venue.slice(0, 12).map(v => baris([v.nama, (v.caborNama || []).join(', '), n(v.laga), v.hari, v.puncak ? `${v.puncak.laga} (${tgl(v.puncak.tanggal)})` : '—']))),
  H2('8.2 Nomor sepi peserta'),
  P(`**${BH.nomorSepi} nomor diikuti ≤ 3 peserta** (setiap peserta pasti bermedali) dan **${BH.nomorTipis} nomor 4–5 peserta**. Daftar lengkap nomor ≤ 3 peserta ada di Lampiran B.`),
  ...gambar('k6_sepi_cabor.png', 'Gambar 7. Nomor dengan ≤ 3 peserta per cabor'),
  tabel([{ h: 'Kontingen', w: 4 }, { h: 'Medali dari nomor ≤ 3 peserta', w: 3, kanan: true }, { h: 'Emas', w: 1.5, kanan: true }, { h: '% dari medalinya', w: 2.5, kanan: true }],
    D.bahan.sepiTop.map(s => baris([s.nama, s.medaliSepi, s.emasSepi, pct(s.medaliSepi / s.medaliTotal)]))),
)
// Bab 9 metode
isi.push(H1('9. Catatan Data & Metode'),
  B(`**Sumber:** arsip seluruh situs panitia porprov.konijabar.or.id (22.228 halaman, disalin ${D.arsip}; cadangan permanen tersimpan), diolah ke basis data terstruktur.`),
  B('**Pemeriksaan silang:** medali per kontingen dari podium = klasemen resmi (27/27); jumlah atlet per kontingen = angka resmi tiap halaman kontingen (27/27).'),
  B('**Medali beregu dihitung satu**, sama dengan klasemen resmi. Pada tabel per atlet, setiap anggota tim dihitung.'),
  B('**Rekor tanding:** hanya laga duel yang selesai dan mempertemukan dua kontingen berbeda; laga tanpa pemenang = seri. Laga peringkat (renang, atletik, dll.) tidak termasuk.'),
  B('**Laga/partai:** situs mencatat setiap partai sebagai satu laga (termasuk setiap papan catur dan duel pool anggar).'),
  B('**Keterbatasan:** situs tidak mencantumkan umur atlet; daftar awak beregu di halaman podium dipotong 8 nama (awak lengkap dibaca dari halaman laga final bila tersedia); data anggaran, ofisial, dan penonton tidak tersedia.'),
)
// Bab 10 rekomendasi
isi.push(H1('10. Rekomendasi untuk PORPROV Berikutnya'),
  Kotak('Arah umum', ['Rekomendasi berikut disusun dari data penyelenggaraan dan hasil PORPROV XV. Angka sasaran bersifat usulan untuk dibahas, bukan keputusan.']),
  H2('1. Batas minimal peserta per nomor'),
  B(`${BH.nomorSepi} nomor dengan ≤ 3 peserta memberi medali kepada setiap pesertanya; terbanyak di ${sepiCab.slice(0, 6).map(([c, v]) => `${c} (${v})`).join(', ')}.`),
  B('Usulan: syarat minimal peserta (mis. 4 kontingen) agar nomor dipertandingkan atau medalinya dihitung penuh; nomor di bawah syarat digabung atau dijadikan eksibisi.'),
  H2('2. Pemerataan jadwal dan venue'),
  B(`Puncak beban ${tgl(hariPuncak.tanggal)} (${n(hariPuncak.laga)} laga di ${hariPuncak.venue} venue) dan ${tgl(hariMedali.tanggal)} (${hariMedali.perebutanMedali} perebutan medali di ${hariMedali.venue} venue).`),
  B(`Usulan: sebar final antar cabor besar agar perebutan medali harian lebih merata; tinjau penyebab ${BH.dibatalkan} laga dibatalkan.`),
  H2('3. Pemerataan prestasi'),
  B(`Lima besar meraih ${pct(e5 / totalEmas)} emas; ${dikuasai.length} cabor dikuasai satu kontingen.`),
  B('Usulan: program pembinaan bersama (pelatih, uji tanding, kejuaraan antara) untuk kontingen di luar sepuluh besar di cabor yang belum mereka kuasai.'),
  H2('4. Efisiensi kontingen sebagai ukuran evaluasi'),
  B(`Rentang ${n(efTop.medaliPer100Atlet, 1)} hingga ${n(efBawah.medaliPer100Atlet, 1)} medali per 100 atlet menunjukkan perbedaan mutu seleksi dan pembinaan antar daerah.`),
  B('Usulan: jadikan medali per 100 atlet sebagai indikator evaluasi KONI daerah selain posisi klasemen.'),
  H2('5. Standar data terbuka'),
  B('Cantumkan **umur atau tahun lahir atlet** (minimal kelompok umur) untuk analisis regenerasi dan seleksi.'),
  B('Tampilkan **daftar awak beregu lengkap** di halaman podium (kini dipotong 8 nama).'),
  B('Simpan **arsip permanen** situs dan data hasil setelah acara, dalam format terbuka (mis. CSV) untuk KONI daerah.'),
  H2('6. Seleksi pelatda Jawa Barat'),
  B(`Daftar atlet unggulan (Bab 6) — ${D.bibitKriteria.multiEmas || 0} multi-emas perorangan, ${D.bibitKriteria.takTerkalahkan || 0} tak terkalahkan, ${D.bibitKriteria.beruntun || 0} menang beruntun — dapat menjadi bahan awal pemantauan calon pelatda, dilengkapi data umur dan tes fisik dari KONI daerah.`),
)
// Lampiran
isi.push(H1(`Lampiran A. Daftar Juara ${n(D.juara.length)} Nomor`),
  P('Nama atlet ditulis untuk nomor perorangan; nomor beregu ditulis nama kontingennya.', { run: { size: 18 } }),
  tabel([{ h: 'Cabor', w: 2.4 }, { h: 'Nomor', w: 4 }, { h: 'Emas', w: 4.2 }, { h: 'Perak', w: 3.6 }, { h: 'Perunggu', w: 4.2 }],
    D.juara.map(j => baris([j.cabor, j.nomor, j.emas, j.perak, j.perunggu])), { ukuran: 13 }),
)
isi.push(H1(`Lampiran B. ${BH.nomorSepi} Nomor dengan ≤ 3 Peserta`),
  tabel([{ h: 'Cabor', w: 3 }, { h: 'Nomor', w: 6 }, { h: 'Peserta', w: 1.5, kanan: true }, { h: 'Emas', w: 3.5 }],
    D.bahan.sepiDaftar.map(s => baris([s.cabor, s.nomor, s.peserta, s.emas])), { ukuran: 14 }),
)
isi.push(H1('Lampiran C. Klasemen Akhir'),
  tabel([{ h: '#', w: 1, kanan: true }, { h: 'Kontingen', w: 5 }, { h: 'Emas', w: 2, kanan: true }, { h: 'Perak', w: 2, kanan: true }, { h: 'Perunggu', w: 2, kanan: true }, { h: 'Total', w: 2, kanan: true }, { h: 'Atlet', w: 2, kanan: true }],
    K.map(k => baris([k.peringkat, k.nama, k.emas, k.perak, k.perunggu, k.total, n(k.atlet)]))),
)

const doc = new Document({
  creator: 'Superadministrator', title: 'Laporan Akhir PORPROV XV — Versi KONI Jawa Barat', features: { updateFields: true },
  styles: { default: { document: { run: { font: FONT, size: 21 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 32, bold: true, color: BIRU }, paragraph: { spacing: { before: 240, after: 180 }, keepNext: true, outlineLevel: 0 } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 25, bold: true, color: '222222' }, paragraph: { spacing: { before: 240, after: 100 }, keepNext: true, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 22, bold: true }, paragraph: { spacing: { before: 180, after: 80 }, keepNext: true, outlineLevel: 2 } },
  ] },
  numbering: { config: [
    { reference: 'poin', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: 'temuan', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134, header: 567, footer: 567 } }, titlePage: true },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Laporan Akhir PORPROV XV — Versi KONI Jawa Barat · DRAF', font: FONT, size: 16, color: '888888' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ['Halaman ', PageNumber.CURRENT, ' dari ', PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: '888888' })] })] }) },
    children: isi,
  }],
})
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(KELUAR, buf); console.log('✓', KELUAR, Math.round(buf.length / 1024) + ' KB') })
