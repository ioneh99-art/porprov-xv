// src/lib/klasemen-situs.ts
// Klasemen medali resmi panitia dari situs KONI Jabar (porprov.konijabar.or.id/data/tally.json),
// apa adanya — dipakai halaman publik dan War Room (keduanya membaca sumber yang sama).
// Hanya untuk server (fetch dengan cache Next 2 menit supaya situs panitia tidak dibanjiri).

import { susunKlasemen, type KlasemenPublik } from './jadwal-publik'
import { bacaKlasemen, SITUS_KONIJABAR } from './konijabar'

/** Gagal dibaca / isinya tidak masuk akal → null. */
export async function ambilKlasemenSitus(agen = 'KONI-Kab-Bandung-Publik/1.0 (+https://www.konikab-bdg.com)'): Promise<KlasemenPublik | null> {
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 8000)
    const r = await fetch(`${SITUS_KONIJABAR}/data/tally.json`, {
      headers: { 'user-agent': agen, accept: 'application/json' },
      signal: ac.signal, next: { revalidate: 120 },
    }).finally(() => clearTimeout(t))
    if (!r.ok) return null
    const j: any = await r.json()
    const baris = susunKlasemen(bacaKlasemen(String(j?.rows_html ?? '')))
    if (baris.length < 20) return null
    const angka = (v: unknown) => (Number.isInteger(v) ? (v as number) : null)
    return {
      baris,
      diperbarui: typeof j?.updated === 'string' ? j.updated : null,
      selesai: angka(j?.progress?.done), nomor: angka(j?.progress?.total),
      dimulai: baris.some(b => b.total > 0),
    }
  } catch { return null }
}
