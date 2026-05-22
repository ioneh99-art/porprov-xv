'use client'
// src/components/MapDashboard.tsx
// Peta sebaran atlet + venue — Leaflet dark theme
// Koordinat approximate, nanti update ke presisi

import { useEffect, useRef } from 'react'
import type { Map as LeafletMap } from 'leaflet'

// ── Koordinat Venue PORPROV XV (approximate) ─────────────
// Klaster I = Bekasi, Klaster II = Bogor, Klaster III = Depok/Bandung
export const VENUE_COORDS: Record<string, { lat: number; lng: number; klaster: number; kec: string }> = {
  // ── KLASTER I — KOTA BEKASI ──────────────────────────
  'Stadion Patriot Candrabhaga':    { lat:-6.2297, lng:106.9946, klaster:1, kec:'Bekasi Selatan' },
  'GOR Bekasi':                     { lat:-6.2381, lng:107.0024, klaster:1, kec:'Bekasi Timur' },
  'Kolam Renang Bekasi':            { lat:-6.2175, lng:106.9951, klaster:1, kec:'Bekasi Utara' },
  'Lapangan Bulutangkis Bekasi':    { lat:-6.2456, lng:107.0134, klaster:1, kec:'Pondok Gede' },
  'GOR Serbaguna Bekasi':           { lat:-6.2612, lng:106.9882, klaster:1, kec:'Bekasi Barat' },
  'Lapangan Tenis Bekasi':          { lat:-6.2298, lng:107.0011, klaster:1, kec:'Bekasi Selatan' },
  'Venue Tinju Bekasi':             { lat:-6.2534, lng:107.0213, klaster:1, kec:'Jatiasih' },
  'Venue Pencak Silat Bekasi':      { lat:-6.2189, lng:106.9823, klaster:1, kec:'Bekasi Barat' },
  'GOR Basket Bekasi':              { lat:-6.2411, lng:107.0089, klaster:1, kec:'Bekasi Timur' },
  'Venue Atletik Bekasi':           { lat:-6.2267, lng:107.0156, klaster:1, kec:'Pondok Gede' },

  // ── KLASTER II — KAB. BOGOR / KOTA BOGOR ─────────────
  'Stadion Pakansari':              { lat:-6.5253, lng:106.8362, klaster:2, kec:'Cibinong' },
  'GOR Laga Tangkas Cibinong':      { lat:-6.4812, lng:106.8421, klaster:2, kec:'Cibinong' },
  'Kolam Renang Cibinong':          { lat:-6.4733, lng:106.8391, klaster:2, kec:'Cibinong' },
  'Situ Cikaret (Dayung)':          { lat:-6.4891, lng:106.8278, klaster:2, kec:'Cibinong' },
  'Lapangan Hockey Pakansari':      { lat:-6.5189, lng:106.8344, klaster:2, kec:'Cibinong' },
  'GOR Bogor Indoor':               { lat:-6.5934, lng:106.7892, klaster:2, kec:'Bogor Selatan' },
  'Lapangan Sepak Bola Bogor':      { lat:-6.6012, lng:106.8023, klaster:2, kec:'Bogor Timur' },
  'Venue Panjat Tebing Bogor':      { lat:-6.5678, lng:106.8156, klaster:2, kec:'Bogor Utara' },
  'GOR Tenis Bogor':                { lat:-6.5823, lng:106.8234, klaster:2, kec:'Bogor Tengah' },
  'Venue Menembak Bogor':           { lat:-6.5512, lng:106.8089, klaster:2, kec:'Bogor Barat' },
  'Lapangan Panahan Bogor':         { lat:-6.5634, lng:106.8312, klaster:2, kec:'Bogor Selatan' },
  'GOR Bulutangkis Bogor':          { lat:-6.5789, lng:106.8198, klaster:2, kec:'Bogor Tengah' },
  'Venue Karate Bogor':             { lat:-6.5456, lng:106.8423, klaster:2, kec:'Cibinong' },
  'Venue Taekwondo Bogor':          { lat:-6.5367, lng:106.8389, klaster:2, kec:'Cibinong' },
  'GOR Senam Bogor':                { lat:-6.5234, lng:106.8445, klaster:2, kec:'Cibinong' },

  // ── KLASTER III — KOTA DEPOK ─────────────────────────
  'GOR Kelapa Dua Depok':           { lat:-6.3612, lng:106.8234, klaster:3, kec:'Kelapa Dua' },
  'Kolam Renang Depok':             { lat:-6.3789, lng:106.8312, klaster:3, kec:'Beji' },
  'Lapangan Sepak Bola Depok':      { lat:-6.3923, lng:106.8156, klaster:3, kec:'Cimanggis' },
  'GOR Badminton Depok':            { lat:-6.3534, lng:106.8423, klaster:3, kec:'Sukmajaya' },
  'Venue Bola Basket Depok':        { lat:-6.3678, lng:106.8389, klaster:3, kec:'Pancoran Mas' },
  'GOR Voli Depok':                 { lat:-6.3845, lng:106.8267, klaster:3, kec:'Sawangan' },
  'Venue Judo Depok':               { lat:-6.3712, lng:106.8334, klaster:3, kec:'Beji' },
  'Venue Gulat Depok':              { lat:-6.3567, lng:106.8456, klaster:3, kec:'Sukmajaya' },
  'Lapangan Atletik Depok':         { lat:-6.3489, lng:106.8512, klaster:3, kec:'Cimanggis' },
  'GOR Angkat Besi Depok':          { lat:-6.3634, lng:106.8289, klaster:3, kec:'Pancoran Mas' },

  // ── KLASTER IV — KAB/KOTA BANDUNG ────────────────────
  'Stadion Gelora Bandung Lautan Api': { lat:-6.9217, lng:107.6391, klaster:4, kec:'Batununggal' },
  'GOR Padjajaran Bandung':         { lat:-6.9012, lng:107.6156, klaster:4, kec:'Cicendo' },
  'Kolam Renang Arcamanik':         { lat:-6.9234, lng:107.6823, klaster:4, kec:'Arcamanik' },
  'Lapangan Hockey Arcamanik':      { lat:-6.9189, lng:107.6789, klaster:4, kec:'Arcamanik' },
  'GOR C-tra Arena Bandung':        { lat:-6.9345, lng:107.6234, klaster:4, kec:'Bojongloa Kidul' },
  'Venue Menembak Bandung':         { lat:-6.9456, lng:107.6312, klaster:4, kec:'Antapani' },
  'GOR Bulu Tangkis Bandung':       { lat:-6.9123, lng:107.6478, klaster:4, kec:'Sumur Bandung' },
  'Lapangan Tenis Bandung':         { lat:-6.9267, lng:107.6534, klaster:4, kec:'Coblong' },
  'Venue Atletik Bandung':          { lat:-6.9389, lng:107.6412, klaster:4, kec:'Mandalajati' },
  'GOR Serbaguna Bandung':          { lat:-6.9512, lng:107.6289, klaster:4, kec:'Regol' },
}

// Warna per klaster
const KLASTER_COLOR: Record<number, { primary: string; label: string; kota: string }> = {
  1: { primary: '#ff4444', label: 'Klaster I',  kota: 'Kota Bekasi'  },
  2: { primary: '#00ffaa', label: 'Klaster II', kota: 'Kab/Kota Bogor' },
  3: { primary: '#4da6ff', label: 'Klaster III',kota: 'Kota Depok'   },
  4: { primary: '#ffd700', label: 'Klaster IV', kota: 'Kab/Kota Bandung' },
}

export interface AtletPin {
  nama_asal: string
  kode_asal: string
  total: number
  putra: number
  putri: number
  lat: number
  lng: number
}

interface Props {
  mode: 'venue' | 'atlet' | 'both'
  atletPins?: AtletPin[]
  highlightKlaster?: number   // untuk war room highlight klaster tertentu
  centerLat?: number
  centerLng?: number
  zoom?: number
  height?: string
  onVenueClick?: (nama: string) => void
  onAtletClick?: (asal: string) => void
}

export default function MapDashboard({
  mode = 'both',
  atletPins = [],
  highlightKlaster,
  centerLat = -6.5,
  centerLng = 107.1,
  zoom = 9,
  height = '400px',
  onVenueClick,
  onAtletClick,
}: Props) {
  const mapDiv = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      if (!mapDiv.current) return
      const L = (await import('leaflet')).default
      // @ts-ignore
      await import('leaflet/dist/leaflet.css')
      if (cancelled || !mapDiv.current) return

      // Cleanup
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
      const el = mapDiv.current as any
      if (el._leaflet_id) el._leaflet_id = undefined

      const map = L.map(mapDiv.current, {
        center:           [centerLat, centerLng],
        zoom,
        zoomControl:      true,
        scrollWheelZoom:  false,
        attributionControl: false,
      })
      mapRef.current = map

      // Dark tile
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© CartoDB',
      }).addTo(map)

      // ── Venue pins ───────────────────────────────────
      if (mode === 'venue' || mode === 'both') {
        Object.entries(VENUE_COORDS).forEach(([nama, v]) => {
          const kl     = KLASTER_COLOR[v.klaster]
          const color  = highlightKlaster
            ? (v.klaster === highlightKlaster ? kl.primary : 'rgba(255,255,255,0.15)')
            : kl.primary
          const opacity = highlightKlaster && v.klaster !== highlightKlaster ? 0.3 : 1

          // Outer glow
          L.circleMarker([v.lat, v.lng], {
            radius: 14, fillColor: color, color: color,
            weight: 0, opacity: 0, fillOpacity: 0.12,
          }).addTo(map)

          // Main dot
          const marker = L.circleMarker([v.lat, v.lng], {
            radius:      7,
            fillColor:   color,
            color:       '#020d06',
            weight:      2,
            opacity,
            fillOpacity: opacity * 0.9,
          }).addTo(map)

          marker.bindPopup(`
            <div style="font-family:system-ui;min-width:200px;padding:4px">
              <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
                ● ${kl.label} · ${kl.kota}
              </div>
              <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:2px">${nama}</div>
              <div style="font-size:11px;color:#6b7280">${v.kec}</div>
            </div>
          `, { className: 'porprov-popup' })

          if (onVenueClick) {
            marker.on('click', () => onVenueClick(nama))
          }
        })
      }

      // ── Atlet pins (sebaran asal) ─────────────────────
      if ((mode === 'atlet' || mode === 'both') && atletPins.length > 0) {
        const maxTotal = Math.max(...atletPins.map(p => p.total))
        atletPins.forEach(pin => {
          const isLokal  = pin.kode_asal.startsWith('3201') || pin.kode_asal.startsWith('3601')
          const color    = isLokal ? '#00ffaa' : '#f87171'
          const radius   = Math.max(6, Math.min(pin.total / maxTotal * 24, 20))

          // Outer glow
          L.circleMarker([pin.lat, pin.lng], {
            radius: radius + 8, fillColor: color,
            color: color, weight: 0, opacity: 0, fillOpacity: 0.1,
          }).addTo(map)

          const marker = L.circleMarker([pin.lat, pin.lng], {
            radius,
            fillColor:   color,
            color:       '#020d06',
            weight:      2,
            opacity:     1,
            fillOpacity: 0.85,
          }).addTo(map)

          marker.bindPopup(`
            <div style="font-family:system-ui;min-width:180px;padding:4px">
              <div style="font-size:9px;font-weight:800;color:${color};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">
                ${isLokal ? '● LOKAL' : '⚠ NON-LOKAL / CABUTAN'}
              </div>
              <div style="font-size:14px;font-weight:900;color:#fff;margin-bottom:6px">${pin.nama_asal}</div>
              <div style="background:#0a0f1a;border-radius:8px;padding:8px;border:1px solid #1e293b">
                <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
                  <span style="color:#6b7280">Total Atlet</span>
                  <b style="color:#fff;font-size:14px">${pin.total}</b>
                </div>
                <div style="display:flex;gap:12px;font-size:11px;margin-top:6px">
                  <span style="color:#00ffaa">⚡ ${pin.putra} Putra</span>
                  <span style="color:#f472b6">♀ ${pin.putri} Putri</span>
                </div>
              </div>
            </div>
          `, { className: 'porprov-popup' })

          if (onAtletClick) {
            marker.on('click', () => onAtletClick(pin.nama_asal))
          }
        })
      }

      // ── Legend ───────────────────────────────────────
      const LegendControl = L.Control.extend({
        onAdd() {
          const div = L.DomUtil.create('div')
        const items = mode === 'atlet'
          ? [
              { color:'#00ffaa', label:'Atlet Lokal' },
              { color:'#f87171', label:'Atlet Non-Lokal' },
            ]
          : mode === 'venue'
          ? Object.values(KLASTER_COLOR).map(k => ({ color:k.primary, label:k.label }))
          : [
              ...Object.values(KLASTER_COLOR).map(k => ({ color:k.primary, label:`Venue ${k.label}` })),
              { color:'#00ffaa', label:'Atlet Lokal' },
              { color:'#f87171', label:'Atlet Non-Lokal' },
            ]

        div.innerHTML = `
          <div style="background:rgba(2,13,6,0.92);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:10px 12px;backdrop-filter:blur(8px)">
            ${items.map(i => `
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;font-family:system-ui;font-size:11px;color:#d1d5db">
                <div style="width:10px;height:10px;border-radius:50%;background:${i.color};box-shadow:0 0 6px ${i.color}80;flex-shrink:0"></div>
                ${i.label}
              </div>
            `).join('')}
          </div>
        `
          return div
        }
      })
      new LegendControl({ position: 'bottomright' }).addTo(map)
    }

    void init()
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [mode, atletPins, highlightKlaster, centerLat, centerLng, zoom])

  return (
    <>
      <style>{`
        .porprov-popup .leaflet-popup-content-wrapper {
          background: #0a0f1a;
          border-radius: 12px;
          border: 1px solid #1e293b;
          box-shadow: 0 15px 35px rgba(0,0,0,0.9);
          color: #d1d5db;
        }
        .porprov-popup .leaflet-popup-content { margin: 12px; }
        .porprov-popup .leaflet-popup-tip { background: #0a0f1a; }
        .leaflet-container { background: #020d06; font-family: system-ui; }
        .leaflet-control-zoom { border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; overflow: hidden; }
        .leaflet-control-zoom a { background: rgba(2,13,6,0.9) !important; color: #9ca3af !important; border-color: rgba(255,255,255,0.08) !important; }
        .leaflet-control-zoom a:hover { background: rgba(0,255,170,0.1) !important; color: #00ffaa !important; }
      `}</style>
      <div ref={mapDiv} style={{ width: '100%', height, background: '#020d06' }}/>
    </>
  )
}