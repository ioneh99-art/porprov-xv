'use client'
// PetaKompetitor — Competitive Intelligence Map
// Data: klasemen real 27 kontingen + estimasi kekuatan per cabor

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap } from 'leaflet'

const ACCENT = '#00ffaa'

// ── Koordinat 27 Kab/Kota Jabar ──────────────────────────
const KONTINGEN_GEO: Record<string, {
  lat: number; lng: number
  singkat: string; warna_khas: string
}> = {
  'KAB. BOGOR':          { lat:-6.5241, lng:106.8451, singkat:'Kab.BGR',  warna_khas:'#00ffaa' },
  'KOTA BOGOR':          { lat:-6.6012, lng:106.7892, singkat:'Kota.BGR', warna_khas:'#22c55e' },
  'KAB. SUKABUMI':       { lat:-6.9212, lng:106.9281, singkat:'Kab.SKB',  warna_khas:'#f59e0b' },
  'KOTA SUKABUMI':       { lat:-6.8277, lng:106.9303, singkat:'Kota.SKB', warna_khas:'#fbbf24' },
  'KAB. CIANJUR':        { lat:-6.8218, lng:107.1423, singkat:'Kab.CJR',  warna_khas:'#a78bfa' },
  'KAB. BANDUNG':        { lat:-7.0815, lng:107.5250, singkat:'Kab.BDG',  warna_khas:'#3b82f6' },
  'KOTA BANDUNG':        { lat:-6.9175, lng:107.6191, singkat:'Kota.BDG', warna_khas:'#2563eb' },
  'KAB. BANDUNG BARAT':  { lat:-6.8400, lng:107.4500, singkat:'KBB',      warna_khas:'#60a5fa' },
  'KOTA CIMAHI':         { lat:-6.8723, lng:107.5420, singkat:'Cimahi',   warna_khas:'#93c5fd' },
  'KAB. GARUT':          { lat:-7.2134, lng:107.9091, singkat:'Kab.GRT',  warna_khas:'#f97316' },
  'KAB. TASIKMALAYA':    { lat:-7.4250, lng:108.1201, singkat:'Kab.TSK',  warna_khas:'#fb923c' },
  'KOTA TASIKMALAYA':    { lat:-7.3277, lng:108.2203, singkat:'Kota.TSK', warna_khas:'#fdba74' },
  'KAB. CIAMIS':         { lat:-7.3298, lng:108.3521, singkat:'Kab.CMS',  warna_khas:'#fcd34d' },
  'KOTA BANJAR':         { lat:-7.3700, lng:108.5400, singkat:'Banjar',   warna_khas:'#fde68a' },
  'KAB. PANGANDARAN':    { lat:-7.6892, lng:108.5512, singkat:'Pngdr',    warna_khas:'#bbf7d0' },
  'KAB. KUNINGAN':       { lat:-6.9812, lng:108.4845, singkat:'Kab.KNG',  warna_khas:'#6ee7b7' },
  'KAB. CIREBON':        { lat:-6.7912, lng:108.5623, singkat:'Kab.CRB',  warna_khas:'#f87171' },
  'KOTA CIREBON':        { lat:-6.7063, lng:108.5570, singkat:'Kota.CRB', warna_khas:'#fca5a5' },
  'KAB. MAJALENGKA':     { lat:-6.8367, lng:108.2423, singkat:'Kab.MJL',  warna_khas:'#c4b5fd' },
  'KAB. SUMEDANG':       { lat:-6.8572, lng:107.9234, singkat:'Kab.SMD',  warna_khas:'#ddd6fe' },
  'KAB. INDRAMAYU':      { lat:-6.3276, lng:108.3214, singkat:'Kab.IDM',  warna_khas:'#fed7aa' },
  'KAB. SUBANG':         { lat:-6.5712, lng:107.7634, singkat:'Kab.SBG',  warna_khas:'#fef08a' },
  'KAB. PURWAKARTA':     { lat:-6.5567, lng:107.4412, singkat:'Kab.PWK',  warna_khas:'#bfdbfe' },
  'KAB. KARAWANG':       { lat:-6.3245, lng:107.3312, singkat:'Kab.KRW',  warna_khas:'#fda4af' },
  'KAB. BEKASI':         { lat:-6.4745, lng:107.1456, singkat:'Kab.BKS',  warna_khas:'#fb7185' },
  'KOTA BEKASI':         { lat:-6.2381, lng:107.0024, singkat:'Kota.BKS', warna_khas:'#f43f5e' },
  'KOTA DEPOK':          { lat:-6.4025, lng:106.7942, singkat:'Depok',    warna_khas:'#e879f9' },
}

export interface KlasemenData {
  nama: string
  emas: number; perak: number; perunggu: number; total: number
}

interface Props {
  klasemen: KlasemenData[]
  selectedCabor?: string | null
  myEmas: number
  height?: number
  center?: [number, number]
  zoom?: number
  /** Kontingen "kita" yang disorot di peta (default Kab. Bogor) */
  myKontingen?: string
  /** Warna penanda "kita" (default accent hijau) */
  myColor?: string
  /** Label tampilan untuk "kita" di popup & legend (default Kab. Bogor) */
  myLabel?: string
}

export default function PetaKompetitor({
  klasemen, selectedCabor, myEmas, height=280, center, zoom,
  myKontingen='KAB. BOGOR', myColor=ACCENT, myLabel='Kab. Bogor',
}: Props) {
  const MY = myKontingen.toUpperCase()
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap|null>(null)

  useEffect(() => {
    if (klasemen.length === 0) return
    let cancelled = false

    async function init() {
      if (!mapDiv.current) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapDiv.current) return
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      const el = mapDiv.current as any
      if (el._leaflet_id) el._leaflet_id = undefined

      const map = L.map(mapDiv.current, {
        center: center ?? [-6.75, 107.35], zoom: zoom ?? 8.5,
        zoomControl: false,
        scrollWheelZoom: false,
        attributionControl: false,
        dragging: true,
      })
      mapRef.current = map

      // Custom zoom control position
      L.control.zoom({ position: 'bottomleft' }).addTo(map)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom:19 }).addTo(map)

      const maxEmas = Math.max(...klasemen.map(k => k.emas), 1)

      klasemen.forEach(k => {
        // Normalize nama untuk lookup
        const namaUpper = k.nama.toUpperCase()
        const geo = Object.entries(KONTINGEN_GEO).find(([key]) =>
          namaUpper.includes(key) || key.includes(namaUpper)
        )
        if (!geo) return

        const [geoKey, geoVal] = geo
        const isUs = geoKey === MY

        // Threat level berdasarkan selisih emas vs kita
        const selisih  = k.emas - myEmas
        const threatPct = Math.min(Math.abs(selisih) / Math.max(myEmas, 1) * 100, 100)

        let color: string
        let threatLabel: string
        if (isUs) {
          color = myColor
          threatLabel = 'KITA'
        } else if (k.emas > myEmas * 1.5) {
          color = '#ef4444'  // Jauh di atas — sangat mengancam
          threatLabel = '🔴 ANCAMAN TINGGI'
        } else if (k.emas > myEmas) {
          color = '#f97316'  // Di atas — waspada
          threatLabel = '🟠 WASPADA'
        } else if (k.emas >= myEmas * 0.7) {
          color = '#fbbf24'  // Seimbang
          threatLabel = '🟡 SEIMBANG'
        } else {
          color = '#6b7280'  // Di bawah kita
          threatLabel = '🟢 DI BAWAH KITA'
        }

        // Radius proporsional dengan emas
        const radius = isUs
          ? 16
          : Math.max(8, Math.min(k.emas / maxEmas * 22, 20))

        // Outer glow
        L.circleMarker([geoVal.lat, geoVal.lng], {
          radius: radius + 10,
          fillColor: color, color: color,
          weight: 0, opacity: 0, fillOpacity: isUs ? 0.15 : 0.08,
        }).addTo(map)

        // Main dot
        const marker = L.circleMarker([geoVal.lat, geoVal.lng], {
          radius,
          fillColor: color,
          color: isUs ? '#020d06' : '#020617',
          weight: isUs ? 3 : 2,
          opacity: 1,
          fillOpacity: isUs ? 1 : 0.85,
        }).addTo(map)

        // Popup
        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:210px;padding:4px">
            <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
              ${threatLabel}
            </div>
            <div style="font-size:15px;font-weight:900;color:#fff;margin-bottom:8px">${k.nama}</div>
            <div style="background:#0a0f1a;border-radius:8px;padding:10px;border:1px solid #1e293b">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;text-align:center">
                <div>
                  <div style="font-size:18px;font-weight:900;color:#ffd700">${k.emas}</div>
                  <div style="font-size:9px;color:#6b7280">🥇 Emas</div>
                </div>
                <div>
                  <div style="font-size:18px;font-weight:900;color:#c0c0c0">${k.perak}</div>
                  <div style="font-size:9px;color:#6b7280">🥈 Perak</div>
                </div>
                <div>
                  <div style="font-size:18px;font-weight:900;color:#cd7f32">${k.perunggu}</div>
                  <div style="font-size:9px;color:#6b7280">🥉 Prunggu</div>
                </div>
              </div>
              ${!isUs ? `
              <div style="padding-top:8px;border-top:1px solid #1e293b;font-size:11px;color:#6b7280">
                Selisih emas vs ${myLabel}:
                <span style="color:${selisih>0?'#ef4444':'#4ade80'};font-weight:700;margin-left:4px">
                  ${selisih > 0 ? '+' : ''}${selisih} emas
                </span>
              </div>` : ''}
            </div>
          </div>
        `, { className: 'kompetitor-popup' })
      })

      // Legend
      const LegendControl = L.Control.extend({
        onAdd() {
          const d = L.DomUtil.create('div')
          d.innerHTML = `
            <div style="background:rgba(2,13,6,0.93);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;backdrop-filter:blur(10px);min-width:150px">
              <div style="font-size:9px;font-weight:800;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Threat Level</div>
              ${[
                { c:myColor, l:`${myLabel} (Kita)` },
                { c:'#ef4444', l:'Ancaman Tinggi' },
                { c:'#f97316', l:'Waspada' },
                { c:'#fbbf24', l:'Seimbang' },
                { c:'#6b7280', l:'Di Bawah Kita' },
              ].map(item => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-family:system-ui;font-size:10px;color:#d1d5db">
                  <div style="width:9px;height:9px;border-radius:50%;background:${item.c};box-shadow:0 0 5px ${item.c}80;flex-shrink:0"></div>
                  ${item.l}
                </div>
              `).join('')}
              <div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);font-size:9px;color:rgba(255,255,255,0.25)">
                Ukuran = jumlah emas
              </div>
            </div>`
          return d
        }
      })
      new LegendControl({ position: 'bottomright' }).addTo(map)
    }

    void init()
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [klasemen, myEmas, MY, myColor, myLabel])

  return (
    <>
      <style>{`
        .kompetitor-popup .leaflet-popup-content-wrapper{background:#0a0f1a;border-radius:12px;border:1px solid #1e293b;box-shadow:0 20px 40px rgba(0,0,0,0.9)}
        .kompetitor-popup .leaflet-popup-content{margin:12px}
        .kompetitor-popup .leaflet-popup-tip{background:#0a0f1a}
        .leaflet-container{background:#020d06;font-family:system-ui}
        .leaflet-control-zoom{border:1px solid rgba(255,255,255,0.1)!important;border-radius:8px!important;overflow:hidden}
        .leaflet-control-zoom a{background:rgba(2,13,6,0.9)!important;color:#9ca3af!important;border-color:rgba(255,255,255,0.08)!important}
        .leaflet-control-zoom a:hover{background:${myColor}1a!important;color:${myColor}!important}
      `}</style>
      <div ref={mapDiv} style={{ width:'100%', height:'100%', background:'#020d06' }}/>
    </>
  )
}