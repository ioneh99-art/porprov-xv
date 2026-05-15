'use client'
import { useEffect, useRef } from 'react'

interface KontingenStat {
  nama: string
  total: number
  putra: number
  putri: number
  siap: number
  menunggu: number
  ditolak: number
  progress: number
}

// Koordinat lat/lng per kabupaten/kota Jawa Barat (akurat)
const KONTINGEN_COORDS: Record<string, [number, number]> = {
  'KAB. BOGOR':          [-6.595, 106.816],
  'KAB. SUKABUMI':       [-6.927, 106.630],
  'KAB. CIANJUR':        [-6.820, 107.140],
  'KAB. BANDUNG':        [-7.083, 107.550],
  'KAB. GARUT':          [-7.212, 107.905],
  'KAB. TASIKMALAYA':    [-7.350, 108.107],
  'KAB. CIAMIS':         [-7.330, 108.350],
  'KAB. KUNINGAN':       [-6.976, 108.485],
  'KAB. CIREBON':        [-6.760, 108.548],
  'KAB. MAJALENGKA':     [-6.836, 108.228],
  'KAB. SUMEDANG':       [-6.857, 107.919],
  'KAB. INDRAMAYU':      [-6.327, 108.320],
  'KAB. SUBANG':         [-6.571, 107.759],
  'KAB. PURWAKARTA':     [-6.556, 107.443],
  'KAB. KARAWANG':       [-6.321, 107.338],
  'KAB. BEKASI':         [-6.375, 107.038],
  'KAB. BANDUNG BARAT':  [-6.840, 107.421],
  'KAB. PANGANDARAN':    [-7.600, 108.490],
  'KOTA BOGOR':          [-6.595, 106.816],
  'KOTA SUKABUMI':       [-6.921, 106.930],
  'KOTA BANDUNG':        [-6.914, 107.609],
  'KOTA CIREBON':        [-6.706, 108.557],
  'KOTA BEKASI':         [-6.238, 106.975],
  'KOTA DEPOK':          [-6.402, 106.794],
  'KOTA TASIKMALAYA':    [-7.327, 108.220],
  'KOTA BANJAR':         [-7.368, 108.538],
  'KOTA CIMAHI':         [-6.872, 107.542],
}

function getColor(progress: number, total: number) {
  if (total === 0) return '#475569'
  if (progress >= 80) return '#10b981'
  if (progress >= 50) return '#f59e0b'
  if (progress > 0)   return '#3b82f6'
  return '#ef4444'
}

function getLabel(progress: number, total: number) {
  if (total === 0) return 'Belum ada data'
  if (progress >= 80) return '✅ On Track'
  if (progress >= 50) return '⚡ Perlu Akselerasi'
  if (progress > 0)   return '⚠️ Tertinggal'
  return '🔴 Belum Mulai'
}

export default function PetaKontingen({ perKontingen }: { perKontingen: KontingenStat[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Dynamic import Leaflet (no SSR)
    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Fix default icon path untuk Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Init map - center Jabar
      const map = L.map(mapRef.current!, {
        center: [-6.9, 107.6],
        zoom: 8,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      })

      mapInstanceRef.current = map

      // Dark tile layer (CartoDB dark)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '©OpenStreetMap ©CARTO',
        maxZoom: 19,
      }).addTo(map)

      // Tambah attribution kecil di pojok
      L.control.attribution({ position: 'bottomleft', prefix: false })
        .addAttribution('<span style="font-size:9px;color:#475569">© OpenStreetMap · CARTO</span>')
        .addTo(map)

      // Plot markers per kontingen
      perKontingen.forEach(k => {
        const coords = KONTINGEN_COORDS[k.nama]
        if (!coords) return

        const color = getColor(k.progress, k.total)
        const status = getLabel(k.progress, k.total)

        // Custom circle marker
        const marker = L.circleMarker(coords, {
          radius: k.total > 50 ? 12 : k.total > 20 ? 9 : 7,
          fillColor: color,
          color: 'rgba(0,0,0,0.4)',
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.85,
        }).addTo(map)

        // Popup
        marker.bindPopup(`
          <div style="
            font-family: system-ui, sans-serif;
            min-width: 180px;
            background: #0f172a;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 12px;
            color: white;
          ">
            <div style="font-weight:700; font-size:13px; margin-bottom:8px; color:white;">
              ${k.nama}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:8px;">
              <div style="background:rgba(255,255,255,0.05); border-radius:6px; padding:6px; text-align:center;">
                <div style="font-size:16px; font-weight:700; color:white;">${k.total}</div>
                <div style="font-size:9px; color:#94a3b8;">Total Atlet</div>
              </div>
              <div style="background:rgba(16,185,129,0.1); border-radius:6px; padding:6px; text-align:center;">
                <div style="font-size:16px; font-weight:700; color:#10b981;">${k.siap}</div>
                <div style="font-size:9px; color:#94a3b8;">Siap Tanding</div>
              </div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-bottom:6px;">
              <span>⚡ ${k.menunggu} menunggu</span>
              <span style="color:${k.ditolak>0?'#ef4444':'#94a3b8'}">✗ ${k.ditolak} ditolak</span>
              <span>L:${k.putra} P:${k.putri}</span>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:6px; padding:6px;">
              <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <span style="font-size:10px; color:#94a3b8;">Progress Kesiapan</span>
                <span style="font-size:11px; font-weight:700; color:${color};">${k.progress}%</span>
              </div>
              <div style="background:#1e293b; border-radius:4px; height:5px; overflow:hidden;">
                <div style="height:100%; width:${k.progress}%; background:${color}; border-radius:4px;"></div>
              </div>
              <div style="font-size:10px; margin-top:4px; color:${color};">${status}</div>
            </div>
          </div>
        `, {
          className: 'sipa-popup',
          maxWidth: 220,
        })

        // Hover highlight
        marker.on('mouseover', () => {
          marker.setStyle({ fillOpacity: 1, radius: (k.total > 50 ? 12 : k.total > 20 ? 9 : 7) + 2 })
          marker.openPopup()
        })
        marker.on('mouseout', () => {
          marker.setStyle({ fillOpacity: 0.85, radius: k.total > 50 ? 12 : k.total > 20 ? 9 : 7 })
          marker.closePopup()
        })
      })

      // Batas wilayah Jabar (fit bounds)
      map.fitBounds([[-7.8, 105.8], [-5.8, 109.0]], { padding: [20, 20] })
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [perKontingen])

  return (
    <>
      {/* Inject Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <style>{`
        .sipa-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6) !important;
          border-radius: 12px !important;
          padding: 0 !important;
        }
        .sipa-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .sipa-popup .leaflet-popup-tip {
          background: #0f172a !important;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          overflow: hidden !important;
        }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid rgba(255,255,255,0.08) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
          color: white !important;
        }
      `}</style>

      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: '280px' }}>
        <div ref={mapRef} className="w-full h-full" />

        {/* Legend overlay */}
        <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2 bg-slate-900/90 backdrop-blur-sm border border-slate-700/50 rounded-lg px-3 py-1.5">
          {[
            { color:'#10b981', label:'≥80%' },
            { color:'#f59e0b', label:'50-79%' },
            { color:'#3b82f6', label:'<50%' },
            { color:'#ef4444', label:'Belum' },
            { color:'#475569', label:'No data' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background:color }} />
              <span className="text-[9px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Info overlay */}
        <div className="absolute top-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-lg px-2.5 py-1.5">
          <div className="text-[10px] text-slate-400">Hover dot untuk detail kontingen</div>
        </div>
      </div>
    </>
  )
}