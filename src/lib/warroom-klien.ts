'use client'
// src/lib/warroom-klien.ts — memuat bahan War Room (/api/konida/warroom) dan menyegarkannya sendiri.

import { useCallback, useEffect, useState } from 'react'
import type { HariPanas, Misi } from './warroom'
import type { KeadaanPic } from './jalur-lapor'

export interface PartaiArena {
  id: number; tanggal: string; jam: string | null; menit: number | null; cabor: string; nomor: string
  babak: string | null; lawan: string | null; venue: string | null; status: string; atlet: string[]
}
export interface KotaPeta { kota: string; label: string; lat: number; lng: number; kegiatan: { cabor: string; venue: string | null }[]; live: number }
export interface DataWarRoom {
  hari_ini: string; jam_kini: string; hari_ke: number | null; diperbarui: string
  misi: { tanggal: string | null; hari_ini: boolean; daftar: Misi[]; besok: number }
  arena: { live: PartaiArena[]; berikut: PartaiArena[] }
  kalender: HariPanas[]
  peta: { tanggal: string; hari_ini: boolean; kota: KotaPeta[] }
  operasi: {
    menunggu: number; catatan_baru: number; catatan_mendesak: number
    cabor_hari_ini: { cabor_id: number; cabor: string; pic: KeadaanPic; laporan_hari_ini: number; live: boolean }[]
  }
  klasemen_diperbarui: string | null
}

export function useWarRoom(kontingenId: number, jedaMs = 20_000) {
  const [data, setData] = useState<DataWarRoom | null>(null)
  const muat = useCallback(async () => {
    try {
      const r = await fetch(`/api/konida/warroom?kontingen_id=${kontingenId}`, { cache: 'no-store' })
      if (r.ok) setData(await r.json())
    } catch { /* angka terakhir tetap dipajang */ }
  }, [kontingenId])
  useEffect(() => {
    muat()
    const iv = setInterval(() => { if (document.visibilityState === 'visible') muat() }, jedaMs)
    return () => clearInterval(iv)
  }, [muat, jedaMs])
  return { data, muat }
}

/** Jam sekarang WIB "HH:MM", diperbarui tiap 30 detik — untuk hitung mundur partai. */
export function useJamWIB() {
  const baca = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false })
  const [j, setJ] = useState(baca)
  useEffect(() => { const iv = setInterval(() => setJ(baca()), 30_000); return () => clearInterval(iv) }, [])
  return j
}

export const tglPendek = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
export const tglPanjangWR = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
