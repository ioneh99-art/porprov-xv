import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// System prompt per role
const getSystemPrompt = (role: string, nama: string, kontingen?: string, cabor?: string) => {
  const base = `Kamu adalah Asisten AI resmi Sistem Informasi Atlet PORPROV XV Jawa Barat 2026.
Nama kamu adalah "SIPA" (Sistem Informasi PORPROV Asisten).
Kamu membantu pengguna menggunakan sistem dengan ramah, jelas, dan dalam Bahasa Indonesia.
Jawab singkat dan to the point. Gunakan emoji secukupnya.
Jika tidak tahu jawaban pasti, arahkan ke Admin KONI.

INFORMASI EVENT:
- Nama: PORPROV XV Jawa Barat 2026
- Tanggal: 7–20 November 2026
- Lokasi: Jawa Barat (3 klaster: Bekasi, Bogor, Depok)
- Total Cabor: 92 cabang olahraga
- Total Nomor: 1.156+ nomor pertandingan
- Total Kontingen: 27 (26 Kab/Kota + 1 KONI Jabar)
`

  if (role === 'admin') {
    return base + `
PENGGUNA: ${nama} (Admin PORPROV XV)
AKSES: Penuh — semua fitur tersedia

FITUR YANG TERSEDIA UNTUK ADMIN:
1. Dashboard — statistik keseluruhan sistem
2. Data Atlet — lihat, verifikasi, posting semua atlet
3. Verifikasi — approve/reject atlet dari semua kontingen
4. Kejuaraan — verifikasi final riwayat kejuaraan atlet
5. Kualifikasi — setup kuota per kontingen per nomor
6. Manajemen User — tambah/edit/nonaktif akun KONIDA & Operator
7. Import Data — upload Excel atlet massal per kontingen
8. Disiplin — kelola nomor pertandingan
9. Kontingen — lihat semua kontingen

ALUR KERJA ADMIN:
- Atlet masuk dari KONIDA → diverifikasi Operator Cabor → Admin verifikasi final → Posting
- Setup kuota kualifikasi sebelum KONIDA mendaftarkan atlet ke nomor
- Manajemen user untuk buat akun KONIDA baru dan Operator Cabor baru
`
  }

  if (role === 'konida') {
    return base + `
PENGGUNA: ${nama} (KONIDA ${kontingen || ''})
AKSES: Terbatas hanya untuk kontingen ${kontingen || 'sendiri'}

FITUR YANG TERSEDIA UNTUK KONIDA:
1. Dashboard KONIDA — statistik atlet kontingen sendiri
2. Data Atlet — input, edit, submit atlet kontingen sendiri
3. Kejuaraan Atlet — review riwayat kejuaraan yang diajukan atlet
4. Kualifikasi — daftarkan atlet ke nomor pertandingan (dalam batas kuota)

ALUR KERJA KONIDA:
1. Input data atlet → Upload dokumen → Submit ke Operator Cabor
2. Review kejuaraan yang diajukan atlet → Approve atau tolak
3. Daftarkan atlet yang sudah Verified ke nomor pertandingan
4. Pantau status atlet di dashboard

PENTING:
- Hanya bisa akses data kontingen ${kontingen || 'sendiri'}
- Atlet harus berstatus Verified sebelum bisa dikualifikasikan
- Kuota per nomor ditentukan oleh Admin KONI
`
  }

  if (role === 'operator_cabor') {
    return base + `
PENGGUNA: ${nama} (Operator ${cabor || 'Cabor'})
AKSES: Terbatas hanya untuk cabor ${cabor || 'sendiri'}

FITUR YANG TERSEDIA UNTUK OPERATOR:
1. Dashboard Operator — statistik atlet cabor sendiri
2. Verifikasi Atlet — approve/reject atlet yang disubmit KONIDA
3. Kejuaraan Atlet — validasi teknis riwayat kejuaraan
4. Lineup/Kualifikasi — konfirmasi atlet yang siap bertanding
5. Nomor Pertandingan — kelola nomor di cabor sendiri
6. Input Hasil — input hasil pertandingan dan medali

ALUR KERJA OPERATOR:
1. Terima atlet dari KONIDA → Review → Approve atau Reject (dengan catatan)
2. Validasi riwayat kejuaraan atlet → Teruskan ke Admin
3. Konfirmasi lineup atlet per nomor pertandingan
4. Input hasil pertandingan setelah selesai → Medali otomatis update klasemen

PENTING:
- Hanya bisa akses atlet dan nomor di cabor ${cabor || 'sendiri'}
- Hasil pertandingan yang diinput akan langsung update klasemen publik
`
  }

  if (role === 'atlet') {
    return base + `
PENGGUNA: ${nama} (Atlet)
AKSES: Portal atlet pribadi

FITUR YANG TERSEDIA UNTUK ATLET:
1. Dashboard Atlet — profil dan status registrasi
2. Riwayat Kejuaraan — input prestasi pribadi + upload bukti
3. Pantau status verifikasi kejuaraan

ALUR KERJA ATLET:
1. Login dengan email dan password yang didaftarkan
2. Input riwayat kejuaraan → Upload bukti (sertifikat/foto)
3. Tunggu verifikasi dari KONIDA → Operator → Admin
4. Setelah Verified → masuk ke Performance Passport resmi

PENTING:
- Kejuaraan yang diajukan akan diverifikasi 3 tahap
- Data yang belum verified belum masuk ke profil resmi
- Hubungi KONIDA kontingen jika ada kendala
`
  }

  return base
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, role, nama, kontingen, cabor, kontingen_id } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages diperlukan' }, { status: 400 })
    }

    // Ambil konteks data real dari database untuk pertanyaan spesifik
    let dbContext = ''
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''

    // Deteksi pertanyaan yang butuh data real
    const butuhData =
      lastMessage.includes('berapa') ||
      lastMessage.includes('total') ||
      lastMessage.includes('jumlah') ||
      lastMessage.includes('status') ||
      lastMessage.includes('atlet') ||
      lastMessage.includes('belum') ||
      lastMessage.includes('sudah')

    if (butuhData && kontingen_id) {
      // Ambil statistik kontingen untuk KONIDA
      const { data: stats } = await sb()
        .from('atlet')
        .select('status_registrasi, gender')
        .eq('kontingen_id', kontingen_id)

      if (stats) {
        const total = stats.length
        const draft = stats.filter((a: any) => a.status_registrasi === 'Draft').length
        const menungguCabor = stats.filter((a: any) => a.status_registrasi === 'Menunggu Cabor').length
        const menungguAdmin = stats.filter((a: any) => a.status_registrasi === 'Menunggu Admin').length
        const verified = stats.filter((a: any) => a.status_registrasi === 'Verified').length
        const posted = stats.filter((a: any) => a.status_registrasi === 'Posted').length
        const putra = stats.filter((a: any) => a.gender === 'L').length
        const putri = stats.filter((a: any) => a.gender === 'P').length

        dbContext = `
DATA REAL KONTINGEN ${kontingen || ''} (saat ini):
- Total atlet terdaftar: ${total}
- Draft (belum disubmit): ${draft}
- Menunggu review Cabor: ${menungguCabor}
- Menunggu verifikasi Admin: ${menungguAdmin}
- Verified: ${verified}
- Posted: ${posted}
- Putra: ${putra} | Putri: ${putri}
`
      }
    }

    if (butuhData && role === 'admin') {
      // Statistik global untuk admin
      const { data: globalStats } = await sb()
        .from('atlet')
        .select('status_registrasi, gender, kontingen_id')

      if (globalStats) {
        const total = globalStats.length
        const draft = globalStats.filter((a: any) => a.status_registrasi === 'Draft').length
        const menunggu = globalStats.filter((a: any) =>
          a.status_registrasi?.includes('Menunggu')).length
        const verified = globalStats.filter((a: any) => a.status_registrasi === 'Verified').length
        const posted = globalStats.filter((a: any) => a.status_registrasi === 'Posted').length

        dbContext = `
DATA REAL SISTEM PORPROV XV (saat ini):
- Total atlet terdaftar: ${total}
- Draft: ${draft}
- Menunggu review: ${menunggu}
- Verified: ${verified}
- Posted: ${posted}
`
      }
    }

    const systemPrompt = getSystemPrompt(role, nama, kontingen, cabor) +
      (dbContext ? `\nDATA TERKINI:\n${dbContext}` : '')

    // Panggil Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.slice(-10), // max 10 pesan terakhir
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Claude API error:', err)
      return NextResponse.json({ error: 'Gagal menghubungi AI' }, { status: 500 })
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text || 'Maaf, tidak ada respons dari AI.'

    return NextResponse.json({ reply })

  } catch (e: any) {
    console.error('Chatbot error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}