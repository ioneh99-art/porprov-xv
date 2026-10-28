'use client'
// PetaPerjuangan — kota tempat cabor Kab. Bandung bertanding hari ini (atau hari
// terdekat). Titik makin besar = makin banyak kegiatan; berdenyut merah = ada
// partai yang sedang main. Sumber: jadwal kegiatan cabor + jadwal partai.

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'
import { MapPin } from 'lucide-react'
import { pasangUbin } from '@/lib/peta-ubin'
import type { DataWarRoom } from '@/lib/warroom-klien'
import { tglPanjangWR } from '@/lib/warroom-klien'

const SOREANG: [number, number] = [-7.0251, 107.5197]
const aman = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export default function PetaPerjuangan({ data, accent = '#38bdf8', tinggi = 420 }: { data: DataWarRoom | null; accent?: string; tinggi?: number }) {
  const wadah = useRef<HTMLDivElement>(null)
  const peta = useRef<LeafletMap | null>(null)
  const lapis = useRef<any>(null)
  const kota = data?.peta.kota ?? []
  const kunci = JSON.stringify(kota.map(k => [k.label, k.kegiatan.length, k.live]))

  useEffect(() => {
    let batal = false
    ;(async () => {
      const L = (await import('leaflet')).default
      // @ts-expect-error — CSS tanpa deklarasi tipe
      await import('leaflet/dist/leaflet.css')
      if (batal || !wadah.current) return
      if (!peta.current) {
        peta.current = L.map(wadah.current, { center: [-6.75, 107.55], zoom: 8, zoomControl: false, attributionControl: false, scrollWheelZoom: false })
        L.control.zoom({ position: 'bottomleft' }).addTo(peta.current)
        pasangUbin(L, peta.current, 'gelap')
      }
      const map = peta.current
      lapis.current?.remove()
      const grup = L.layerGroup().addTo(map)
      lapis.current = grup
      // Rumah: Soreang.
      L.marker(SOREANG, { icon: L.divIcon({ className: '', html: `<div class="pp-rumah">🏠</div>`, iconSize: [24, 24], iconAnchor: [12, 12] }) })
        .bindTooltip('Kab. Bandung (Soreang)', { direction: 'top' }).addTo(grup)
      const batas: [number, number][] = [SOREANG]
      for (const k of kota) {
        const ukuran = Math.min(54, 22 + k.kegiatan.length * 6)
        const html = `<div class="pp-titik ${k.live ? 'pp-live' : ''}" style="width:${ukuran}px;height:${ukuran}px;--w:${k.live ? '#ef4444' : accent}"><span>${k.kegiatan.length}</span></div>`
        L.polyline([SOREANG, [k.lat, k.lng]], { color: k.live ? '#ef4444' : accent, weight: 1.2, opacity: 0.45, dashArray: '4 6' }).addTo(grup)
        L.marker([k.lat, k.lng], { icon: L.divIcon({ className: '', html, iconSize: [ukuran, ukuran], iconAnchor: [ukuran / 2, ukuran / 2] }) })
          .bindPopup(`<b>${aman(k.label)}</b>${k.live ? ' · <span style="color:#ef4444">● LIVE</span>' : ''}<br>${k.kegiatan.map(x => `• ${aman(x.cabor)}${x.venue ? ` <span style="opacity:.6">— ${aman(x.venue)}</span>` : ''}`).join('<br>')}`, { className: 'pp-popup' })
          .bindTooltip(`${k.label} · ${k.kegiatan.length} kegiatan`, { direction: 'top' })
          .addTo(grup)
        batas.push([k.lat, k.lng])
      }
      if (batas.length > 1) map.fitBounds(L.latLngBounds(batas), { paddingTopLeft: [40, 90], paddingBottomRight: [40, 40], maxZoom: 9 })
    })()
    return () => { batal = true }
  }, [kunci, accent])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { peta.current?.remove(); peta.current = null }, [])

  return (
    <div className="rounded-3xl overflow-hidden relative" style={{ border: `1px solid ${accent}25`, height: tinggi }}>
      <div className="absolute top-0 left-0 right-0 z-[500] pointer-events-none px-5 py-4" style={{ background: 'linear-gradient(to bottom, #020a14 0%, rgba(2,10,20,0.6) 70%, transparent 100%)' }}>
        <div className="flex items-center gap-2"><MapPin size={14} style={{ color: accent }} /><h3 className="text-sm font-bold text-white">Peta Perjuangan</h3></div>
        <p className="text-[10px] uppercase tracking-widest font-mono mt-0.5 text-white/50">
          {data ? `${data.peta.hari_ini ? 'Hari ini' : tglPanjangWR(data.peta.tanggal)} · ${kota.length} kota · ${kota.reduce((n, k) => n + k.kegiatan.length, 0)} kegiatan` : 'Memuat…'}
        </p>
      </div>
      <div ref={wadah} className="absolute inset-0" />
      {data && kota.length === 0 && <div className="absolute inset-0 z-[400] grid place-items-center text-sm text-zinc-400 bg-black/40">Tidak ada kegiatan terjadwal.</div>}
      <style>{`
        .pp-titik{border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--w) 28%,transparent);border:2px solid var(--w);color:#fff;font:800 12px system-ui;box-shadow:0 0 16px var(--w)}
        .pp-live{animation:pp-denyut 1.4s ease-in-out infinite}
        @keyframes pp-denyut{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.7)}50%{box-shadow:0 0 0 14px rgba(239,68,68,0)}}
        .pp-rumah{font-size:18px;filter:drop-shadow(0 0 6px #38bdf8)}
        .pp-popup .leaflet-popup-content-wrapper{background:#0a0f1a;color:#e2e8f0;border:1px solid #1e293b;border-radius:10px;font-size:12px}
        .pp-popup .leaflet-popup-tip{background:#0a0f1a}
      `}</style>
    </div>
  )
}
