'use client'
import { useEffect, useState } from 'react'
import {
  Monitor, MapPin, Users, CheckCircle, Clock,
  AlertTriangle, ChevronRight, Zap, Activity,
  Target, Building2, TrendingUp, Calendar
} from 'lucide-react'

interface AtletItem { gender: string; status_registrasi: string; cabor_id: number; cabang_olahraga: any }
interface VenueItem { id: number; nama: string; alamat: string; klaster_id: number }

function PieChart({ segments, size=80, label, sublabel }: {
  segments:{value:number;color:string}[]; size?:number; label?:string; sublabel?:string
}) {
  const total = segments.reduce((a,b)=>a+b.value,0)
  if(total===0) return <svg width={size} height={size} viewBox="0 0 80 80"><circle cx="40" cy="40" r="28" fill="none" stroke="#1e1e1e" strokeWidth="12"/></svg>
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
      <svg width={size} height={size} viewBox="0 0 80 80">{paths}<circle cx="40" cy="40" r="17" fill="#0a0a0a"/></svg>
      {label&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'white',fontWeight:700,fontSize:12,lineHeight:1}}>{label}</span>
        {sublabel&&<span style={{color:'#4b5563',fontSize:9,marginTop:1}}>{sublabel}</span>}
      </div>}
    </div>
  )
}

// Ticker komponen
function LiveTicker({ items }: { items: string[] }) {
  const [idx, setIdx] = useState(0)
  useEffect(()=>{
    const t = setInterval(()=>setIdx(i=>(i+1)%items.length), 3000)
    return ()=>clearInterval(t)
  },[items.length])
  if(!items.length) return null
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{background:'#dc2626'}}/>
      <span style={{color:'#9ca3af',fontSize:11,transition:'all 0.3s'}}>{items[idx]}</span>
    </div>
  )
}

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

    const [{data:atletAll},{data:venueList},{data:medali},{data:jadwal}] = await Promise.all([
      sb.from('atlet').select('id,gender,status_registrasi,cabor_id,cabang_olahraga(nama)')
        .eq('kontingen_id', kontingen_id ?? 0),
      sb.from('venue').select('id,nama,alamat,klaster_id').eq('klaster_id',1),
      sb.from('klasemen_medali').select('*,kontingen(nama)').order('emas',{ascending:false}).limit(5),
      sb.from('jadwal_pertandingan').select('id,nama_pertandingan,jam_mulai,venue_id,venue(nama)').order('jam_mulai').limit(20),
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
    const perCabor=Object.entries(caborMap).map(([nama,total])=>({nama,total})).sort((a,b)=>b.total-a.total).slice(0,5)

    const tickerItems = [
      `${total} atlet terdaftar dari Kontingen Bekasi`,
      `${(venueList??[]).length} venue aktif Klaster I`,
      `${siap} atlet siap tanding (${pctSiap}%)`,
      ...(menunggu>0?[`${menunggu} atlet menunggu verifikasi`]:[]),
    ]

    setData({
      kpi:{total,putra,putri,menunggu,siap,ditolak,pctSiap},
      venue:venueList??[],
      medali:medali??[],
      jadwal:jadwal??[],
      perCabor,
      tickerItems,
      me,
    })
    setLoading(false)
  }

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{width:32,height:32,border:'2px solid #1a1a1a',borderTopColor:'#dc2626',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const {kpi,venue,medali,jadwal,perCabor,tickerItems,me} = data
  const PIE_COLORS=['#dc2626','#ef4444','#f87171','#374151','#1f2937']
  const ani=(d=0)=>({
    style:{transitionDelay:`${d}ms`},
    className:`transition-all duration-700 ${animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}`
  })

  return (
    <div className="space-y-4" style={{background:'transparent'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ══ HERO — Split + Ticker ══════════════════════════════════════════ */}
      <div {...ani(0)}>
        <div className="rounded-2xl overflow-hidden" style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
          {/* Red top bar */}
          <div style={{height:3,background:'linear-gradient(90deg,#dc2626,#ef4444,#dc2626)'}}/>
          <div className="grid grid-cols-2">
            {/* Kiri — command info */}
            <div className="p-5 border-r" style={{borderColor:'#1a1a1a',background:'#0a0a0a'}}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.3)'}}>
                  <Monitor size={16} style={{color:'#dc2626'}}/>
                </div>
                <div>
                  <div style={{color:'#dc2626',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase'}}>Command Center</div>
                  <div style={{color:'white',fontSize:13,fontWeight:700}}>Kota Bekasi · Klaster I</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)'}}>
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#dc2626'}}/>
                  <span style={{color:'#dc2626',fontSize:9,fontWeight:700}}>LIVE</span>
                </div>
              </div>
              <div style={{color:'#4b5563',fontSize:11,marginBottom:8}}>
                {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              </div>
              {/* Ticker */}
              <div className="px-3 py-2 rounded-lg" style={{background:'#111',border:'1px solid #1a1a1a'}}>
                <LiveTicker items={tickerItems}/>
              </div>
            </div>
            {/* Kanan — quick stats */}
            <div className="p-5">
              <div style={{color:'#374151',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:10}}>Ringkasan Kontingen</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:'Total Atlet',value:kpi.total,color:'#e5e7eb'},
                  {label:'Siap Tanding',value:`${kpi.siap}`,color:'#dc2626'},
                  {label:'Kesiapan',value:`${kpi.pctSiap}%`,color:'#dc2626'},
                  {label:'Putra',value:kpi.putra,color:'#9ca3af'},
                  {label:'Putri',value:kpi.putri,color:'#9ca3af'},
                  {label:'Menunggu',value:kpi.menunggu,color:kpi.menunggu>0?'#f59e0b':'#374151'},
                ].map(({label,value,color})=>(
                  <div key={label} className="text-center p-2.5 rounded-xl" style={{background:'#111',border:'1px solid #1a1a1a'}}>
                    <div style={{color,fontSize:20,fontWeight:800,lineHeight:1}}>{value}</div>
                    <div style={{color:'#374151',fontSize:9,marginTop:3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert ditolak */}
      {kpi.ditolak>0&&(
        <div {...ani(50)}>
          <a href="/konida/atlet" className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group"
            style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.2)'}}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'rgba(220,38,38,0.15)'}}>
              <AlertTriangle size={13} style={{color:'#dc2626'}}/>
            </div>
            <span style={{color:'#fca5a5',fontSize:12,flex:1}}>{kpi.ditolak} atlet ditolak — perlu direvisi segera</span>
            <ChevronRight size={13} style={{color:'rgba(220,38,38,0.4)'}}/>
          </a>
        </div>
      )}

      {/* ══ KPI CARDS — 5 bold ══════════════════════════════════════════════ */}
      <div {...ani(100)} className="grid grid-cols-5 gap-3">
        {[
          {label:'Total Atlet',value:kpi.total,icon:Users,color:'#dc2626',border:'rgba(220,38,38,0.2)'},
          {label:'Siap Tanding',value:kpi.siap,icon:CheckCircle,color:'#10b981',border:'rgba(16,185,129,0.2)'},
          {label:'Menunggu',value:kpi.menunggu,icon:Clock,color:kpi.menunggu>0?'#f59e0b':'#374151',border:kpi.menunggu>0?'rgba(245,158,11,0.2)':'rgba(55,65,81,0.3)'},
          {label:'Venue Aktif',value:venue.length,icon:Building2,color:'#dc2626',border:'rgba(220,38,38,0.2)'},
          {label:'Ditolak',value:kpi.ditolak,icon:AlertTriangle,color:kpi.ditolak>0?'#ef4444':'#374151',border:kpi.ditolak>0?'rgba(239,68,68,0.2)':'rgba(55,65,81,0.3)'},
        ].map(({label,value,icon:Icon,color,border})=>(
          <div key={label} className="p-4 rounded-2xl" style={{background:'#0f0f0f',border:`1px solid ${border}`}}>
            <Icon size={14} style={{color,marginBottom:8}}/>
            <div style={{color:'white',fontSize:24,fontWeight:800,lineHeight:1}}>{value}</div>
            <div style={{color:'#374151',fontSize:9,marginTop:4,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* ══ VENUE GRID + PIE ════════════════════════════════════════════════ */}
      <div {...ani(150)} className="grid grid-cols-3 gap-4">

        {/* Venue Grid — 25 venue */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{borderBottom:'1px solid #1a1a1a'}}>
            <div className="flex items-center gap-2">
              <Building2 size={13} style={{color:'#dc2626'}}/>
              <span style={{color:'white',fontSize:13,fontWeight:600}}>Venue Monitor Klaster I</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{background:'rgba(220,38,38,0.15)',color:'#dc2626',fontSize:10}}>
                {venue.length} venue
              </span>
            </div>
            <a href="/konida/penyelenggara/venue" style={{color:'#dc2626',fontSize:11}} className="flex items-center gap-1">
              Semua <ChevronRight size={11}/>
            </a>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-2">
              {venue.slice(0,16).map((v:VenueItem,i:number)=>(
                <div key={v.id} className="p-2.5 rounded-xl transition-all cursor-pointer"
                  style={{
                    background: i<3?'rgba(220,38,38,0.08)':'#111',
                    border: i<3?'1px solid rgba(220,38,38,0.25)':'1px solid #1a1a1a',
                  }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{background:i<3?'#dc2626':'#374151'}}/>
                    <span style={{color:i<3?'#fca5a5':'#4b5563',fontSize:8,fontWeight:700,textTransform:'uppercase'}}>
                      {i<3?'Aktif':'Standby'}
                    </span>
                  </div>
                  <div style={{color:i<3?'#e5e7eb':'#6b7280',fontSize:10,fontWeight:600,lineHeight:1.3}}>
                    {v.nama.replace('GOR ','').replace('Lapangan ','').replace('Kolam ','').slice(0,18)}
                  </div>
                </div>
              ))}
              {venue.length>16&&(
                <div className="p-2.5 rounded-xl flex items-center justify-center col-span-1"
                  style={{background:'#111',border:'1px solid #1a1a1a'}}>
                  <span style={{color:'#374151',fontSize:10}}>+{venue.length-16}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pie Status + Cabor */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
            <div style={{color:'#6b7280',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>
              Status Registrasi
            </div>
            <div className="flex items-center gap-3">
              <PieChart size={72} label={`${kpi.pctSiap}%`} sublabel="Siap"
                segments={[
                  {value:kpi.siap,color:'#dc2626'},
                  {value:kpi.menunggu,color:'#f59e0b'},
                  {value:kpi.kpi?.draft??0,color:'#1f2937'},
                  {value:kpi.ditolak,color:'#374151'},
                ]}/>
              <div className="flex-1 space-y-1.5">
                {[
                  {label:'Siap',value:kpi.siap,color:'#dc2626'},
                  {label:'Menunggu',value:kpi.menunggu,color:'#f59e0b'},
                  {label:'Ditolak',value:kpi.ditolak,color:'#374151'},
                ].map(({label,value,color})=>(
                  <div key={label} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>
                      <span style={{color:'#4b5563',fontSize:10}}>{label}</span>
                    </div>
                    <span style={{color:'white',fontSize:10,fontWeight:700}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
            <div style={{color:'#6b7280',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>
              Top Cabor
            </div>
            <div className="space-y-2">
              {perCabor.map((c:any,i:number)=>(
                <div key={c.nama} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:['#dc2626','#ef4444','#f87171','#374151','#1f2937'][i]}}/>
                  <span style={{color:'#6b7280',fontSize:10,flex:1}} className="truncate">{c.nama}</span>
                  <span style={{color:'white',fontSize:10,fontWeight:700}}>{c.total}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ TIMELINE JADWAL + MEDALI ════════════════════════════════════════ */}
      <div {...ani(200)} className="grid grid-cols-3 gap-4">

        {/* Timeline hari ini */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:'1px solid #1a1a1a'}}>
            <Calendar size={13} style={{color:'#dc2626'}}/>
            <span style={{color:'white',fontSize:13,fontWeight:600}}>Jadwal Pertandingan Hari Ini</span>
            <span style={{color:'#374151',fontSize:10,marginLeft:'auto'}}>
              {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'short'})}
            </span>
          </div>
          {jadwal.length===0?(
            <div className="text-center py-10">
              <Calendar size={24} style={{color:'#1f2937',margin:'0 auto 8px'}}/>
              <div style={{color:'#374151',fontSize:11}}>Belum ada jadwal pertandingan</div>
            </div>
          ):(
            <div className="divide-y" >
              {jadwal.slice(0,6).map((j:any,i:number)=>(
                <div key={j.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-shrink-0 text-center w-12">
                    <div style={{color:'#dc2626',fontSize:13,fontWeight:800}}>{j.jam_mulai?.slice(0,5)??'--:--'}</div>
                  </div>
                  <div className="w-px h-8 flex-shrink-0" style={{background:'#1a1a1a'}}/>
                  <div className="flex-1 min-w-0">
                    <div style={{color:'#e5e7eb',fontSize:12,fontWeight:500}} className="truncate">{j.nama_pertandingan??'Pertandingan'}</div>
                    <div style={{color:'#374151',fontSize:10}} className="truncate">{j.venue?.nama??'-'}</div>
                  </div>
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{background:i===0?'#dc2626':'#1f2937'}}/>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Klasemen Medali */}
        <div className="rounded-2xl overflow-hidden" style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:'1px solid #1a1a1a'}}>
            <Target size={13} style={{color:'#f59e0b'}}/>
            <span style={{color:'white',fontSize:13,fontWeight:600}}>Klasemen Medali</span>
          </div>
          {medali.filter((m:any)=>m.total>0).length===0?(
            <div className="text-center py-10">
              <Target size={24} style={{color:'#1f2937',margin:'0 auto 8px'}}/>
              <div style={{color:'#374151',fontSize:11}}>Belum ada data</div>
            </div>
          ):(
            <div className="divide-y" >
              {medali.filter((m:any)=>m.total>0).slice(0,6).map((m:any,i:number)=>(
                <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span style={{fontSize:12,width:18,textAlign:'center',flexShrink:0}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{color:'#374151',fontSize:11}}>{i+1}</span>}
                  </span>
                  <span style={{color:'#9ca3af',fontSize:11,flex:1}} className="truncate">{m.kontingen?.nama}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    <span style={{color:'#f59e0b',fontSize:10,fontWeight:700}}>{m.emas}</span>
                    <span style={{color:'#6b7280',fontSize:10}}>{m.perak}</span>
                    <span style={{color:'#78350f',fontSize:10}}>{m.perunggu}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ SIPA + QUICK ACTIONS ════════════════════════════════════════════ */}
      <div {...ani(250)} className="grid grid-cols-3 gap-4">

        {/* SIPA */}
        <div className="col-span-2 relative rounded-2xl overflow-hidden"
          style={{background:'#080f0a',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#10b981,transparent)'}}/>
          <div className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)'}}>
              <Zap size={18} style={{color:'#10b981'}}/>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span style={{color:'white',fontWeight:700,fontSize:13}}>SIPA Intelligence</span>
                <span style={{fontSize:9,padding:'2px 8px',borderRadius:20,background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>
                  ● Online
                </span>
              </div>
              <p style={{color:'#4b5563',fontSize:11,marginBottom:8}}>AI analitik khusus operasional Bekasi</p>
              <div className="flex gap-2 flex-wrap">
                {['Venue mana yang paling sibuk hari ini?','Berapa atlet Bekasi siap tanding?','Status kesiapan teknis venue?'].map(q=>(
                  <a key={q} href="/konida/sipa"
                    style={{fontSize:10,padding:'4px 10px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',color:'#6b7280',cursor:'pointer',textDecoration:'none'}}>
                    → {q}
                  </a>
                ))}
              </div>
            </div>
            <a href="/konida/sipa"
              className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-xl flex-shrink-0"
              style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
              Buka <ChevronRight size={12}/>
            </a>
          </div>
        </div>

        {/* Quick actions penyelenggara */}
        <div className="space-y-2">
          {[
            {label:'Command Center',desc:'Monitor semua venue',href:'/konida/penyelenggara',icon:Monitor,color:'#dc2626'},
            {label:'Kesiapan Teknis',desc:'Checklist per venue',href:'/konida/penyelenggara/kesiapan',icon:CheckCircle,color:'#f59e0b'},
            {label:'Laporan Harian',desc:'Generate & kirim',href:'/konida/penyelenggara/laporan',icon:TrendingUp,color:'#10b981'},
          ].map(({label,desc,href,icon:Icon,color})=>(
            <a key={href} href={href}
              className="flex items-center gap-3 p-3 rounded-xl transition-all group"
              style={{background:'#0f0f0f',border:'1px solid #1a1a1a'}}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{background:`${color}15`}}>
                <Icon size={14} style={{color}}/>
              </div>
              <div className="min-w-0">
                <div style={{color:'white',fontSize:12,fontWeight:600}}>{label}</div>
                <div style={{color:'#374151',fontSize:10}}>{desc}</div>
              </div>
              <ChevronRight size={12} style={{color:'#1f2937',marginLeft:'auto'}}/>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}