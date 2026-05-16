'use client'
import { useEffect, useState, useRef } from 'react'
import {
  Monitor, Users, CheckCircle, Clock,
  AlertTriangle, Zap, Building2, Trophy
} from 'lucide-react'

interface AtletItem { gender:string; status_registrasi:string; cabor_id:number; cabang_olahraga:any }
interface VenueItem { id:number; nama:string; alamat:string; klaster_id:number; lat?:number; lng?:number }

function PieChart({ segments, size=80, label, sublabel }: {
  segments:{value:number;color:string}[]; size?:number; label?:string; sublabel?:string
}) {
  const total = segments.reduce((a,b)=>a+b.value,0)
  if(total===0) return (
    <div style={{position:'relative',width:size,height:size}}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="28" fill="none" stroke="#f1f5f9" strokeWidth="12"/>
      </svg>
    </div>
  )
  let cum=0
  const paths = segments.filter(s=>s.value>0).map((seg,i)=>{
    const pct=seg.value/total
    const s0=cum*2*Math.PI-Math.PI/2; cum+=pct
    const e0=cum*2*Math.PI-Math.PI/2
    const r=28,cx=40,cy=40
    const x1=cx+r*Math.cos(s0),y1=cy+r*Math.sin(s0)
    const x2=cx+r*Math.cos(e0),y2=cy+r*Math.sin(e0)
    return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${pct>0.5?1:0} 1 ${x2},${y2}Z`} fill={seg.color}/>
  })
  return (
    <div style={{position:'relative',width:size,height:size}}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        {paths}<circle cx="40" cy="40" r="17" fill="#ffffff"/>
      </svg>
      {label&&(
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
          <span style={{color:'#333',fontWeight:700,fontSize:size>80?13:11,lineHeight:1}}>{label}</span>
          {sublabel&&<span style={{color:'#999',fontSize:9,marginTop:1}}>{sublabel}</span>}
        </div>
      )}
    </div>
  )
}

function LiveTicker({ items }: { items:string[] }) {
  const [idx, setIdx] = useState(0)
  useEffect(()=>{
    if(!items.length) return
    const t = setInterval(()=>setIdx(i=>(i+1)%items.length),3500)
    return ()=>clearInterval(t)
  },[items.length])
  if(!items.length) return null
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0"/>
      <span className="text-gray-500 text-xs">{items[idx]}</span>
    </div>
  )
}

// ── Peta Leaflet — Fix StrictMode "Map container being reused" ──────────────
function PetaVenue({ venues }: { venues: VenueItem[] }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    // ✅ Fix: reset _leaflet_id SEBELUM cek instance
    // Ini mencegah "Map container being reused by another instance"
    const container = mapRef.current as any
    if (container._leaflet_id) {
      container._leaflet_id = null
    }

    // Destroy instance lama kalau ada
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove() } catch {}
      mapInstanceRef.current = null
    }

    let cancelled = false

    const initMap = async () => {
      if (cancelled || !mapRef.current) return
      const L = (await import('leaflet')).default
      await import('leaflet/dist/leaflet.css' as any)
      if (cancelled || !mapRef.current) return

      // Double check container clear
      const cont = mapRef.current as any
      if (cont._leaflet_id) cont._leaflet_id = null

      const map = L.map(mapRef.current, {
        center: [-6.238270, 106.975573],
        zoom: 12,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      })
      mapInstanceRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      venues.forEach((v, i) => {
        const lat = v.lat || (-6.238 + (Math.sin(i) * 0.05))
        const lng = v.lng || (106.975 + (Math.cos(i) * 0.05))
        const isActive = i < 3

        const marker = L.circleMarker([lat, lng], {
          radius: isActive ? 10 : 7,
          fillColor: isActive ? '#4caf50' : '#ff9800',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map)

        marker.bindPopup(`
          <div style="background:white;color:#333;padding:5px;min-width:180px;">
            <div style="font-size:10px;color:${isActive?'#4caf50':'#ff9800'};font-weight:bold;margin-bottom:4px;text-transform:uppercase;">
              ● ${isActive?'Sedang Digunakan':'Standby'}
            </div>
            <div style="font-weight:bold;font-size:13px;margin-bottom:4px;color:#3c4858;">${v.nama}</div>
            <div style="font-size:11px;color:#999;">${v.alamat||'Kota Bekasi, Jawa Barat'}</div>
          </div>
        `, { className: 'custom-popup-light' })
      })
    }

    initMap()

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove() } catch {}
        mapInstanceRef.current = null
      }
      // Reset container ID saat unmount
      if (mapRef.current) {
        (mapRef.current as any)._leaflet_id = null
      }
    }
  }, [venues])

  return (
    <div className="w-full h-full relative rounded-lg overflow-hidden">
      <style>{`
        .custom-popup-light .leaflet-popup-content-wrapper{box-shadow:0 4px 15px rgba(0,0,0,0.1);border-radius:8px;}
        .custom-popup-light .leaflet-popup-tip{background:white;}
        .leaflet-container{background:#f8f9fa;z-index:10;}
        .leaflet-control-zoom{border:none!important;box-shadow:0 2px 5px rgba(0,0,0,0.1)!important;}
        .leaflet-control-zoom a{background:white!important;color:#666!important;}
      `}</style>
      <div ref={mapRef} className="w-full h-full min-h-[220px]"/>
    </div>
  )
}

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardBekasi() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [animIn, setAnimIn] = useState(false)

  useEffect(()=>{loadData()},[])
  useEffect(()=>{if(!loading) setTimeout(()=>setAnimIn(true),50)},[loading])

  const loadData = async () => {
    const me = await fetch('/api/auth/me').then(r=>r.json()).catch(()=>null)
    const {createClient} = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const kontingen_id = me?.kontingen_id

    let jadwalData: any[] = []
    try {
      const { data: jd } = await sb.from('jadwal_pertandingan')
        .select('id,nama_pertandingan,jam_mulai,venue_id,venue(nama)')
        .order('jam_mulai').limit(20)
      jadwalData = jd ?? []
    } catch {}

    const [{data:atletAll},{data:venueList},{data:medali}] = await Promise.all([
      sb.from('atlet').select('id,gender,status_registrasi,cabor_id,cabang_olahraga(nama)')
        .eq('kontingen_id', kontingen_id ?? 0),
      sb.from('venue').select('id,nama,alamat,klaster_id').eq('klaster_id',1),
      sb.from('klasemen_medali').select('*,kontingen(nama)').order('emas',{ascending:false}).limit(5),
    ])

    const atlet = atletAll??[]
    const total=atlet.length
    const putra=atlet.filter((a:AtletItem)=>a.gender==='L').length
    const putri=atlet.filter((a:AtletItem)=>a.gender==='P').length
    const menunggu=atlet.filter((a:AtletItem)=>a.status_registrasi?.includes('Menunggu')).length
    const verified=atlet.filter((a:AtletItem)=>a.status_registrasi==='Verified').length
    const posted=atlet.filter((a:AtletItem)=>a.status_registrasi==='Posted').length
    const ditolak=atlet.filter((a:AtletItem)=>a.status_registrasi?.includes('Ditolak')).length
    const siap=verified+posted
    const pctSiap=total>0?Math.round((siap/total)*100):0

    const caborMap:Record<string,number>={}
    atlet.forEach((a:AtletItem)=>{
      const n=(a.cabang_olahraga as any)?.nama??'Lainnya'
      caborMap[n]=(caborMap[n]||0)+1
    })
    const perCabor=Object.entries(caborMap)
      .map(([nama,total])=>({nama,total}))
      .sort((a,b)=>b.total-a.total).slice(0,5)

    const tickerItems=[
      `${total} atlet terdaftar · Kontingen Kota Bekasi`,
      `${(venueList??[]).length} venue aktif · Klaster I`,
      `${siap} atlet siap tanding (${pctSiap}%)`,
      ...(menunggu>0?[`${menunggu} atlet menunggu verifikasi`]:[]),
    ]

    setData({
      kpi:{total,putra,putri,menunggu,siap,ditolak,pctSiap},
      venue:venueList??[],
      medali:medali??[],
      jadwal:jadwalData,
      perCabor,
      tickerItems,
      me,
    })
    setLoading(false)
  }

  if(loading) return (
    <div className="flex items-center justify-center h-64 bg-[#f0f2f5] rounded-xl">
      <div className="w-8 h-8 border-4 border-gray-300 border-t-orange-500 rounded-full animate-spin"/>
    </div>
  )

  const {kpi,venue,medali,jadwal,perCabor,tickerItems} = data
  const ani = (d=0) => ({
    className:`transition-all duration-700 ${animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}`,
    style:{transitionDelay:`${d}ms`}
  })

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 space-y-10 font-sans">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div {...ani(0)} className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center">
            <img src="/logos/bekasi.png" alt="Kota Bekasi"
              className="w-10 h-10 object-contain"
              onError={e=>{
                const el=e.target as HTMLImageElement
                el.style.display='none'
                el.parentElement!.innerHTML='<span class="font-black text-orange-500 text-sm">BKS</span>'
              }}/>
          </div>
          <div>
            <h1 className="text-2xl font-light text-[#3c4858] tracking-wide">
              Dashboard Kota Bekasi
            </h1>
            <div className="mt-1"><LiveTicker items={tickerItems}/></div>
          </div>
        </div>
        <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm text-gray-500 flex items-center gap-2 border border-gray-100">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
          Tuan Rumah Klaster I · PORPROV XV
        </div>
      </div>

      {/* Alert */}
      {kpi.ditolak>0&&(
        <div {...ani(20)} className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4 flex items-center gap-3 shadow-sm">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={18}/>
          <span className="text-red-700 text-sm font-medium flex-1">{kpi.ditolak} atlet ditolak — perlu direvisi segera</span>
          <a href="/konida/atlet" className="text-red-600 text-sm font-bold hover:underline flex-shrink-0">Review →</a>
        </div>
      )}

      {/* ══ 4 KARTU FLOATING ICON ════════════════════════════════════════════ */}
      <div {...ani(50)} className="grid grid-cols-4 gap-6 pt-6">
        {[
          {label:'Total Atlet',value:kpi.total,Icon:Users,grad:'from-orange-500 to-orange-400',shadow:'shadow-orange-400/50',sub:`${kpi.putra} Putra / ${kpi.putri} Putri`},
          {label:'Siap Tanding',value:kpi.siap,Icon:CheckCircle,grad:'from-green-500 to-green-400',shadow:'shadow-green-400/50',sub:`Kesiapan ${kpi.pctSiap}%`},
          {label:'Menunggu',value:kpi.menunggu,Icon:AlertTriangle,grad:'from-red-500 to-red-400',shadow:'shadow-red-400/50',sub:kpi.menunggu>0?'Verifikasi pending':'Tidak ada antrian'},
          {label:'Venue Aktif',value:venue.length,Icon:Building2,grad:'from-cyan-500 to-cyan-400',shadow:'shadow-cyan-400/50',sub:'Klaster I Bekasi'},
        ].map((card,i)=>(
          <div key={i} className="relative bg-white rounded-xl shadow-md p-4 pt-6">
            <div className={`absolute -top-6 left-4 w-16 h-16 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${card.grad} ${card.shadow}`}>
              <card.Icon size={26} className="text-white"/>
            </div>
            <div className="text-right">
              <p className="text-sm font-light text-[#999] mb-1">{card.label}</p>
              <h4 className="text-2xl font-light text-[#3c4858]">{card.value}</h4>
            </div>
            <div className="border-t border-gray-100 mt-5 pt-3 flex items-center gap-2">
              <Clock size={12} className="text-gray-400"/>
              <p className="text-xs font-light text-[#999]">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ══ CHARTS ROW ════════════════════════════════════════════════════════ */}
      <div {...ani(100)} className="grid grid-cols-3 gap-6 pt-8">

        {/* Peta venue */}
        <div className="relative bg-white rounded-xl shadow-md p-4 pt-10">
          <div className="absolute -top-8 left-4 right-4 h-40 rounded-xl bg-gradient-to-tr from-green-500 to-green-400 shadow-lg shadow-green-400/40 p-2 overflow-hidden">
            <div className="w-full h-full rounded-lg overflow-hidden">
              <PetaVenue venues={venue}/>
            </div>
          </div>
          <div className="mt-36">
            <h6 className="text-[#3c4858] text-base font-normal">Peta Venue Bekasi</h6>
            <p className="text-sm text-[#999] font-light mt-1">{venue.length} venue tersebar di Klaster I</p>
            <div className="border-t border-gray-100 mt-3 pt-3 flex items-center gap-2">
              <Clock size={12} className="text-gray-400"/>
              <span className="text-xs text-[#999]">🟢 Aktif · 🟠 Standby</span>
            </div>
          </div>
        </div>

        {/* Top Cabor bar */}
        <div className="relative bg-white rounded-xl shadow-md p-4 pt-10">
          <div className="absolute -top-8 left-4 right-4 h-40 rounded-xl bg-gradient-to-tr from-orange-500 to-orange-400 shadow-lg shadow-orange-400/40 p-5 flex flex-col justify-end">
            {perCabor.slice(0,4).map((c:any,i:number)=>(
              <div key={i} className="mb-2">
                <div className="flex justify-between text-white text-xs mb-1 font-light opacity-90">
                  <span className="truncate pr-2">{c.nama}</span>
                  <span>{c.total}</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full" style={{width:`${(c.total/(perCabor[0]?.total||1))*100}%`}}/>
                </div>
              </div>
            ))}
            {perCabor.length===0&&<div className="text-white/70 text-xs text-center">Belum ada data</div>}
          </div>
          <div className="mt-36">
            <h6 className="text-[#3c4858] text-base font-normal">Peminat Cabor Teratas</h6>
            <p className="text-sm text-[#999] font-light mt-1">Berdasarkan data registrasi atlet</p>
            <div className="border-t border-gray-100 mt-3 pt-3 flex items-center gap-2">
              <Clock size={12} className="text-gray-400"/>
              <span className="text-xs text-[#999]">Data real-time</span>
            </div>
          </div>
        </div>

        {/* Pie kesiapan */}
        <div className="relative bg-white rounded-xl shadow-md p-4 pt-10">
          <div className="absolute -top-8 left-4 right-4 h-40 rounded-xl bg-gradient-to-tr from-red-500 to-red-400 shadow-lg shadow-red-400/40 flex items-center justify-center">
            <PieChart size={110} label={`${kpi.pctSiap}%`} sublabel="Siap"
              segments={[
                {value:kpi.siap,color:'#ffffff'},
                {value:kpi.menunggu,color:'rgba(255,255,255,0.5)'},
                {value:kpi.ditolak,color:'rgba(0,0,0,0.15)'},
              ]}/>
          </div>
          <div className="mt-36">
            <h6 className="text-[#3c4858] text-base font-normal">Kesiapan Kontingen</h6>
            <p className="text-sm text-[#999] font-light mt-1">Persentase verifikasi admin</p>
            <div className="border-t border-gray-100 mt-3 pt-3">
              <span className="text-xs text-[#999]">✅ {kpi.siap} Siap · ⏳ {kpi.menunggu} Tunggu · ✗ {kpi.ditolak} Tolak</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TABEL + MEDALI + QUICK MENU ════════════════════════════════════ */}
      <div {...ani(150)} className="grid grid-cols-3 gap-6">

        {/* Tabel jadwal */}
        <div className="col-span-2 bg-white rounded-xl shadow-md">
          <div className="bg-gradient-to-tr from-purple-600 to-purple-500 p-4 rounded-t-xl shadow-[0_4px_20px_rgba(0,0,0,0.14),0_7px_10px_-5px_rgba(156,39,176,0.4)] mx-4 -mt-4 relative z-10">
            <h4 className="text-white text-lg font-normal mb-0.5">Jadwal Pertandingan</h4>
            <p className="text-purple-100 text-sm font-light">
              {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
            </p>
          </div>
          <div className="p-5 pt-6 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-cyan-600 text-xs font-medium border-b border-gray-200">
                  <th className="px-3 py-3 w-20">Waktu</th>
                  <th className="px-3 py-3">Pertandingan</th>
                  <th className="px-3 py-3">Venue</th>
                </tr>
              </thead>
              <tbody>
                {jadwal.length===0?(
                  <tr><td colSpan={3} className="text-center py-10 text-gray-400 text-sm">Belum ada jadwal tersimpan</td></tr>
                ):(
                  jadwal.slice(0,6).map((j:any,i:number)=>(
                    <tr key={j.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">{j.jam_mulai?.slice(0,5)??'--:--'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600">{j.nama_pertandingan??'Pertandingan'}</td>
                      <td className="px-3 py-3 text-sm text-gray-400">{j.venue?.nama??'-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Kanan: Medali + Quick menu */}
        <div className="flex flex-col gap-6">
          {/* Medali */}
          <div className="bg-white rounded-xl shadow-md pb-2">
            <div className="bg-gradient-to-tr from-yellow-500 to-amber-400 p-4 rounded-t-xl shadow-[0_4px_20px_rgba(0,0,0,0.14),0_7px_10px_-5px_rgba(245,158,11,0.4)] mx-4 -mt-4 relative z-10 flex items-center gap-3">
              <Trophy className="text-white" size={20}/>
              <div>
                <h4 className="text-white text-sm font-medium">Klasemen Medali</h4>
                <p className="text-amber-100 text-xs font-light">Perolehan sementara</p>
              </div>
            </div>
            <div className="px-4 pt-4">
              {medali.filter((m:any)=>m.total>0).length===0?(
                <div className="text-center py-6 text-gray-400 text-sm">Belum ada medali</div>
              ):(
                medali.filter((m:any)=>m.total>0).slice(0,4).map((m:any,i:number)=>(
                  <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-4 ${i===0?'text-yellow-500':i===1?'text-gray-400':i===2?'text-amber-600':'text-gray-300'}`}>{i+1}</span>
                      <span className="text-[#3c4858] text-sm truncate max-w-[120px]">{m.kontingen?.nama}</span>
                    </div>
                    <div className="flex gap-1.5 text-xs font-bold flex-shrink-0">
                      <span className="text-yellow-500 bg-yellow-50 px-1.5 py-0.5 rounded">{m.emas}</span>
                      <span className="text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{m.perak}</span>
                      <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{m.perunggu}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick menu */}
          <div className="grid grid-cols-2 gap-3">
            <a href="/konida/penyelenggara" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-all group">
              <Monitor className="mx-auto mb-2 text-cyan-500 group-hover:scale-110 transition-transform" size={22}/>
              <span className="text-xs text-[#3c4858] font-medium uppercase tracking-wide">Command Center</span>
            </a>
            <a href="/konida/sipa" className="bg-gradient-to-tr from-blue-600 to-blue-500 p-4 rounded-xl shadow-md text-center hover:shadow-lg transition-all group relative overflow-hidden">
              <Zap className="absolute -right-2 -bottom-2 text-white/20 w-16 h-16"/>
              <Zap className="mx-auto mb-2 text-white group-hover:scale-110 transition-transform relative z-10" size={22}/>
              <span className="text-xs text-white font-medium uppercase tracking-wide relative z-10">Tanya SIPA AI</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}