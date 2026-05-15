'use client'
import { useEffect, useState } from 'react'
import {
  Monitor, MapPin, Users, CheckCircle, Clock,
  AlertTriangle, ChevronRight, Zap, Target,
  Building2, TrendingUp, Calendar, Shield,
  Activity, Trophy, PhoneCall
} from 'lucide-react'

// Palet warna dari logo Kota Bekasi:
// Primary:   #E84E0F (oranye api)
// Secondary: #1B6EC2 (biru pita)
// Accent:    #3AAA35 (hijau gedung)
// Highlight: #F5C518 (kuning emas)
// Base:      #FFFFFF light mode

interface AtletItem { gender:string; status_registrasi:string; cabor_id:number; cabang_olahraga:any }
interface VenueItem { id:number; nama:string; alamat:string; klaster_id:number }

function PieChart({ segments, size=80, label, sublabel }: {
  segments:{value:number;color:string}[]; size?:number; label?:string; sublabel?:string
}) {
  const total = segments.reduce((a,b)=>a+b.value,0)
  if(total===0) return (
    <div style={{position:'relative',width:size,height:size}}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="28" fill="none" stroke="#f1f5f9" strokeWidth="12"/>
      </svg>
      {label&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#94a3b8',fontWeight:700,fontSize:13}}>0</span>
      </div>}
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
        {paths}<circle cx="40" cy="40" r="17" fill="white"/>
      </svg>
      {label&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'#1e293b',fontWeight:700,fontSize:size>80?13:11,lineHeight:1}}>{label}</span>
        {sublabel&&<span style={{color:'#94a3b8',fontSize:9,marginTop:1}}>{sublabel}</span>}
      </div>}
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
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{width:6,height:6,borderRadius:'50%',background:'#E84E0F',animation:'pulse 1.5s infinite',flexShrink:0}}/>
      <span style={{color:'#64748b',fontSize:12}}>{items[idx]}</span>
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

    // Fetch jadwal dengan try-catch terpisah
    let jadwalData: any[] = []
    try {
      const { data: jd } = await sb.from('jadwal_pertandingan')
        .select('id,nama_pertandingan,jam_mulai,venue_id,venue(nama)')
        .order('jam_mulai').limit(20)
      jadwalData = jd ?? []
    } catch {}

    const [
      {data:atletAll},
      {data:venueList},
      {data:medali},
    ] = await Promise.all([
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
    const perCabor=Object.entries(caborMap).map(([nama,total])=>({nama,total})).sort((a,b)=>b.total-a.total).slice(0,5)

    const tickerItems = [
      `${total} atlet terdaftar · Kontingen Kota Bekasi`,
      `${(venueList??[]).length} venue aktif · Klaster I`,
      `${siap} atlet siap tanding (${pctSiap}%)`,
      ...(menunggu>0?[`${menunggu} atlet menunggu verifikasi`]:[]),
    ]

    setData({ kpi:{total,putra,putri,menunggu,siap,ditolak,pctSiap}, venue:venueList??[], medali:medali??[], jadwal:jadwalData, perCabor, tickerItems, me })
    setLoading(false)
  }

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
      <div style={{width:32,height:32,border:'3px solid #fed7aa',borderTopColor:'#E84E0F',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )

  const {kpi,venue,medali,jadwal,perCabor,tickerItems,me} = data
  const PIE_COLORS = ['#E84E0F','#1B6EC2','#3AAA35','#F5C518','#94a3b8']
  const ani = (d=0) => ({
    className: `transition-all duration-700 ${animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}`,
    style: {transitionDelay:`${d}ms`}
  })

  return (
    <div className="space-y-4 pb-6" style={{fontFamily:'system-ui,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>

      {/* ══ HERO — Light Mode ════════════════════════════════════════════ */}
      <div {...ani(0)}>
        <div className="rounded-2xl overflow-hidden" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
          {/* Gradient bar logo Bekasi */}
          <div style={{height:4,background:'linear-gradient(90deg,#E84E0F,#F5C518,#3AAA35,#1B6EC2)'}}/>
          <div className="grid grid-cols-2">
            {/* Kiri — identity */}
            <div className="p-5 border-r border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{background:'#fff7ed',border:'1.5px solid #fed7aa'}}>
                  <img src="/logos/bekasi.png" alt="Kota Bekasi"
                    style={{width:44,height:44,objectFit:'contain'}}
                    onError={e=>{const el=e.target as HTMLImageElement;el.style.display='none';const p=el.parentElement!;p.innerHTML='<span style="font-size:14px;font-weight:900;color:#E84E0F;">BKS</span>'}}/>
                </div>
                <div>
                  <div style={{color:'#E84E0F',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase'}}>Tuan Rumah · Klaster I</div>
                  <div style={{color:'#1e293b',fontSize:16,fontWeight:800,lineHeight:1.2}}>Kota Bekasi</div>
                  <div style={{color:'#94a3b8',fontSize:10,marginTop:1}}>Inovatif · Kreatif · Terdepan</div>
                </div>
              </div>
              <div style={{background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,padding:'8px 12px'}}>
                <LiveTicker items={tickerItems}/>
              </div>
            </div>
            {/* Kanan — quick KPI */}
            <div className="p-5">
              <div style={{color:'#94a3b8',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Ringkasan Hari Ini</div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {label:'Total Atlet',value:kpi.total,color:'#1e293b',bg:'#f8fafc',border:'#e2e8f0'},
                  {label:'Siap Tanding',value:kpi.siap,color:'#3AAA35',bg:'#f0fdf4',border:'#bbf7d0'},
                  {label:'Kesiapan',value:`${kpi.pctSiap}%`,color:'#E84E0F',bg:'#fff7ed',border:'#fed7aa'},
                  {label:'Putra',value:kpi.putra,color:'#1B6EC2',bg:'#eff6ff',border:'#bfdbfe'},
                  {label:'Putri',value:kpi.putri,color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe'},
                  {label:'Menunggu',value:kpi.menunggu,color:kpi.menunggu>0?'#d97706':'#94a3b8',bg:kpi.menunggu>0?'#fffbeb':'#f8fafc',border:kpi.menunggu>0?'#fde68a':'#e2e8f0'},
                ].map(({label,value,color,bg,border})=>(
                  <div key={label} className="text-center p-2.5 rounded-xl" style={{background:bg,border:`1px solid ${border}`}}>
                    <div style={{color,fontSize:20,fontWeight:800,lineHeight:1}}>{value}</div>
                    <div style={{color:'#94a3b8',fontSize:9,marginTop:3,textTransform:'uppercase',letterSpacing:'0.05em'}}>{label}</div>
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
          <a href="/konida/atlet" className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
            style={{background:'#fef2f2',border:'1px solid #fecaca'}}>
            <div style={{width:30,height:30,borderRadius:8,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <AlertTriangle size={14} style={{color:'#ef4444'}}/>
            </div>
            <span style={{color:'#b91c1c',fontSize:13,flex:1,fontWeight:500}}>{kpi.ditolak} atlet ditolak — perlu direvisi segera</span>
            <ChevronRight size={14} style={{color:'#fca5a5'}}/>
          </a>
        </div>
      )}

      {/* ══ 5 KPI CARDS ═══════════════════════════════════════════════════ */}
      <div {...ani(100)} className="grid grid-cols-5 gap-3">
        {[
          {label:'Total Atlet',value:kpi.total,icon:Users,color:'#E84E0F',bg:'#fff7ed',border:'#fed7aa',iconBg:'#ffedd5'},
          {label:'Siap Tanding',value:kpi.siap,icon:CheckCircle,color:'#3AAA35',bg:'#f0fdf4',border:'#bbf7d0',iconBg:'#dcfce7'},
          {label:'Menunggu',value:kpi.menunggu,icon:Clock,color:kpi.menunggu>0?'#d97706':'#94a3b8',bg:kpi.menunggu>0?'#fffbeb':'#f8fafc',border:kpi.menunggu>0?'#fde68a':'#e2e8f0',iconBg:kpi.menunggu>0?'#fef9c3':'#f1f5f9'},
          {label:'Venue Aktif',value:venue.length,icon:Building2,color:'#1B6EC2',bg:'#eff6ff',border:'#bfdbfe',iconBg:'#dbeafe'},
          {label:'Ditolak',value:kpi.ditolak,icon:AlertTriangle,color:kpi.ditolak>0?'#ef4444':'#94a3b8',bg:kpi.ditolak>0?'#fef2f2':'#f8fafc',border:kpi.ditolak>0?'#fecaca':'#e2e8f0',iconBg:kpi.ditolak>0?'#fee2e2':'#f1f5f9'},
        ].map(({label,value,icon:Icon,color,bg,border,iconBg})=>(
          <div key={label} className="rounded-2xl p-4" style={{background:bg,border:`1px solid ${border}`,boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{width:32,height:32,borderRadius:8,background:iconBg,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:10}}>
              <Icon size={16} style={{color}}/>
            </div>
            <div style={{color:'#1e293b',fontSize:24,fontWeight:800,lineHeight:1}}>{value}</div>
            <div style={{color:'#94a3b8',fontSize:10,marginTop:4,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* ══ VENUE GRID + CHARTS ════════════════════════════════════════════ */}
      <div {...ani(150)} className="grid grid-cols-3 gap-4">

        {/* Venue grid */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{borderBottom:'1px solid #f1f5f9'}}>
            <div className="flex items-center gap-2">
              <div style={{width:28,height:28,borderRadius:8,background:'#fff7ed',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Building2 size={14} style={{color:'#E84E0F'}}/>
              </div>
              <span style={{color:'#1e293b',fontSize:13,fontWeight:600}}>Venue Monitor · Klaster I</span>
              <span style={{background:'#fff7ed',color:'#E84E0F',border:'1px solid #fed7aa',borderRadius:20,padding:'1px 8px',fontSize:10,fontWeight:600}}>
                {venue.length}
              </span>
            </div>
            <a href="/konida/penyelenggara/venue" style={{color:'#E84E0F',fontSize:11,display:'flex',alignItems:'center',gap:3,textDecoration:'none'}}>
              Lihat semua <ChevronRight size={11}/>
            </a>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-4 gap-2">
              {venue.slice(0,16).map((v:VenueItem,i:number)=>(
                <div key={v.id} className="p-2.5 rounded-xl cursor-pointer transition-all hover:shadow-sm"
                  style={{
                    background:i<3?'#fff7ed':'#f8fafc',
                    border:i<3?'1px solid #fed7aa':'1px solid #e2e8f0',
                  }}>
                  <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:i<3?'#E84E0F':i<6?'#3AAA35':'#cbd5e1',flexShrink:0}}/>
                    <span style={{color:i<3?'#E84E0F':i<6?'#3AAA35':'#94a3b8',fontSize:8,fontWeight:700,textTransform:'uppercase'}}>
                      {i<3?'Aktif':i<6?'Siap':'Standby'}
                    </span>
                  </div>
                  <div style={{color:i<3?'#1e293b':'#64748b',fontSize:10,fontWeight:i<3?600:400,lineHeight:1.3}}>
                    {v.nama.replace('GOR ','').replace('Lapangan ','').replace('Kolam ','').slice(0,18)}
                  </div>
                </div>
              ))}
              {venue.length>16&&(
                <div className="p-2.5 rounded-xl flex items-center justify-center"
                  style={{background:'#f8fafc',border:'1px dashed #cbd5e1'}}>
                  <span style={{color:'#94a3b8',fontSize:10}}>+{venue.length-16}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-3">
          {/* Pie registrasi */}
          <div className="rounded-2xl p-4" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{color:'#64748b',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Status Registrasi</div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <PieChart size={72} label={`${kpi.pctSiap}%`} sublabel="Siap"
                segments={[
                  {value:kpi.siap,color:'#3AAA35'},
                  {value:kpi.menunggu,color:'#F5C518'},
                  {value:kpi.kpi?.draft??0,color:'#e2e8f0'},
                  {value:kpi.ditolak,color:'#fca5a5'},
                ]}/>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                {[
                  {label:'Siap',value:kpi.siap,color:'#3AAA35'},
                  {label:'Menunggu',value:kpi.menunggu,color:'#F5C518'},
                  {label:'Ditolak',value:kpi.ditolak,color:'#ef4444'},
                ].map(({label,value,color})=>(
                  <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <div style={{width:6,height:6,borderRadius:'50%',background:color}}/>
                      <span style={{color:'#64748b',fontSize:11}}>{label}</span>
                    </div>
                    <span style={{color:'#1e293b',fontSize:11,fontWeight:700}}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top cabor */}
          <div className="rounded-2xl p-4" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 2px rgba(0,0,0,0.04)'}}>
            <div style={{color:'#64748b',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Top Cabor</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {perCabor.map((c:any,i:number)=>(
                <div key={c.nama}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{color:'#64748b',fontSize:10,flex:1}} className="truncate">{c.nama}</span>
                    <span style={{color:PIE_COLORS[i%5],fontSize:10,fontWeight:700,marginLeft:4}}>{c.total}</span>
                  </div>
                  <div style={{height:3,background:'#f1f5f9',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(c.total/perCabor[0].total)*100}%`,background:PIE_COLORS[i%5],borderRadius:2}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ JADWAL + MEDALI ════════════════════════════════════════════════ */}
      <div {...ani(200)} className="grid grid-cols-3 gap-4">

        {/* Jadwal */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:'1px solid #f1f5f9'}}>
            <div style={{width:28,height:28,borderRadius:8,background:'#eff6ff',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Calendar size={14} style={{color:'#1B6EC2'}}/>
            </div>
            <span style={{color:'#1e293b',fontSize:13,fontWeight:600}}>Jadwal Pertandingan Hari Ini</span>
            <span style={{color:'#94a3b8',fontSize:10,marginLeft:'auto'}}>
              {new Date().toLocaleDateString('id-ID',{day:'numeric',month:'short'})}
            </span>
          </div>
          {jadwal.length===0?(
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <Calendar size={28} style={{color:'#e2e8f0',margin:'0 auto 8px'}}/>
              <div style={{color:'#94a3b8',fontSize:12}}>Belum ada jadwal pertandingan</div>
            </div>
          ):(
            <div>
              {jadwal.slice(0,6).map((j:any,i:number)=>(
                <div key={j.id} className="flex items-center gap-3 px-5 py-3"
                  style={{borderBottom:i<5?'1px solid #f8fafc':'none',background:i===0?'#fff7ed':'transparent'}}>
                  <div style={{flexShrink:0,textAlign:'center',width:40}}>
                    <div style={{color:i===0?'#E84E0F':'#64748b',fontSize:13,fontWeight:700}}>{j.jam_mulai?.slice(0,5)??'--:--'}</div>
                  </div>
                  <div style={{width:1,height:30,background:'#f1f5f9',flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:'#1e293b',fontSize:12,fontWeight:500}} className="truncate">{j.nama_pertandingan??'Pertandingan'}</div>
                    <div style={{color:'#94a3b8',fontSize:10}} className="truncate">{j.venue?.nama??'-'}</div>
                  </div>
                  {i===0&&<div style={{width:6,height:6,borderRadius:'50%',background:'#E84E0F',animation:'pulse 1.5s infinite',flexShrink:0}}/>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medali */}
        <div className="rounded-2xl overflow-hidden" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:'1px solid #f1f5f9'}}>
            <div style={{width:28,height:28,borderRadius:8,background:'#fffbeb',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Trophy size={14} style={{color:'#F5C518'}}/>
            </div>
            <span style={{color:'#1e293b',fontSize:13,fontWeight:600}}>Klasemen Medali</span>
          </div>
          {medali.filter((m:any)=>m.total>0).length===0?(
            <div style={{textAlign:'center',padding:'40px 0'}}>
              <Trophy size={24} style={{color:'#e2e8f0',margin:'0 auto 8px'}}/>
              <div style={{color:'#94a3b8',fontSize:12}}>Belum ada data</div>
            </div>
          ):(
            <div>
              {medali.filter((m:any)=>m.total>0).slice(0,5).map((m:any,i:number)=>(
                <div key={m.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderBottom:i<4?'1px solid #f8fafc':'none'}}>
                  <span style={{fontSize:14,width:20,textAlign:'center',flexShrink:0}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{color:'#94a3b8',fontSize:11}}>{i+1}</span>}
                  </span>
                  <span style={{color:'#475569',fontSize:11,flex:1}} className="truncate">{m.kontingen?.nama}</span>
                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                    <span style={{color:'#F5C518',fontSize:10,fontWeight:700}}>{m.emas}</span>
                    <span style={{color:'#94a3b8',fontSize:10}}>{m.perak}</span>
                    <span style={{color:'#b45309',fontSize:10}}>{m.perunggu}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ══ SIPA + QUICK ACTIONS PENYELENGGARA ════════════════════════════ */}
      <div {...ani(250)} className="grid grid-cols-3 gap-4">

        {/* SIPA */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{height:3,background:'linear-gradient(90deg,#3AAA35,#1B6EC2)'}}/>
          <div className="p-5 flex items-center gap-4">
            <div style={{width:44,height:44,borderRadius:14,background:'#f0fdf4',border:'1.5px solid #bbf7d0',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Zap size={20} style={{color:'#3AAA35'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <span style={{color:'#1e293b',fontWeight:700,fontSize:13}}>SIPA Intelligence</span>
                <span style={{fontSize:10,padding:'2px 8px',borderRadius:20,background:'#f0fdf4',color:'#3AAA35',border:'1px solid #bbf7d0',fontWeight:500}}>● Online</span>
              </div>
              <p style={{color:'#64748b',fontSize:11,marginBottom:8}}>AI analitik operasional Kota Bekasi · tanya dalam bahasa natural</p>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {['Venue mana paling sibuk hari ini?','Atlet Bekasi siap berapa?','Status kesiapan teknis venue?'].map(q=>(
                  <a key={q} href="/konida/sipa"
                    style={{fontSize:11,padding:'4px 10px',borderRadius:8,background:'#f8fafc',border:'1px solid #e2e8f0',color:'#64748b',textDecoration:'none'}}>
                    → {q}
                  </a>
                ))}
              </div>
            </div>
            <a href="/konida/sipa"
              style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:600,color:'white',padding:'8px 16px',borderRadius:10,background:'linear-gradient(135deg,#3AAA35,#2d8a29)',flexShrink:0,textDecoration:'none'}}>
              Buka <ChevronRight size={13}/>
            </a>
          </div>
        </div>

        {/* Quick actions penyelenggara */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {[
            {label:'Command Center',desc:'Monitor 25 venue live',href:'/konida/penyelenggara',icon:Monitor,color:'#E84E0F',bg:'#fff7ed',border:'#fed7aa'},
            {label:'Kesiapan Teknis',desc:'Checklist per venue',href:'/konida/penyelenggara/kesiapan',icon:CheckCircle,color:'#1B6EC2',bg:'#eff6ff',border:'#bfdbfe'},
            {label:'Laporan Harian',desc:'Generate & kirim ke KONI',href:'/konida/penyelenggara/laporan',icon:TrendingUp,color:'#3AAA35',bg:'#f0fdf4',border:'#bbf7d0'},
          ].map(({label,desc,href,icon:Icon,color,bg,border})=>(
            <a key={href} href={href} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,background:bg,border:`1px solid ${border}`,textDecoration:'none',transition:'all 0.15s'}}>
              <div style={{width:34,height:34,borderRadius:10,background:'white',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
                <Icon size={16} style={{color}}/>
              </div>
              <div style={{minWidth:0}}>
                <div style={{color:'#1e293b',fontSize:12,fontWeight:600}}>{label}</div>
                <div style={{color:'#94a3b8',fontSize:10}}>{desc}</div>
              </div>
              <ChevronRight size={13} style={{color:'#cbd5e1',marginLeft:'auto'}}/>
            </a>
          ))}
        </div>
      </div>

      {/* ══ PREVIEW MENU PENYELENGGARA ══════════════════════════════════════ */}
      <div {...ani(300)}>
        <div className="rounded-2xl overflow-hidden" style={{background:'white',border:'1px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{height:3,background:'linear-gradient(90deg,#E84E0F,#F5C518,#3AAA35,#1B6EC2)'}}/>
          <div className="px-5 py-4">
            <div style={{color:'#94a3b8',fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14}}>
              Menu Penyelenggara Klaster I
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                {label:'Command Center',icon:Monitor,href:'/konida/penyelenggara',color:'#E84E0F',bg:'#fff7ed',border:'#fed7aa',desc:'Monitor live venue'},
                {label:'Venue & Jadwal',icon:MapPin,href:'/konida/penyelenggara/venue',color:'#1B6EC2',bg:'#eff6ff',border:'#bfdbfe',desc:'25 venue · jadwal'},
                {label:'Kesiapan Teknis',icon:CheckCircle,href:'/konida/penyelenggara/kesiapan',color:'#3AAA35',bg:'#f0fdf4',border:'#bbf7d0',desc:'Checklist · issues'},
                {label:'Akomodasi Tamu',icon:Users,href:'/konida/penyelenggara/akomodasi',color:'#F5C518',bg:'#fffbeb',border:'#fde68a',desc:'Check-in · shuttle'},
                {label:'Laporan Harian',icon:TrendingUp,href:'/konida/penyelenggara/laporan',color:'#7c3aed',bg:'#f5f3ff',border:'#ddd6fe',desc:'PDF otomatis'},
              ].map(({label,icon:Icon,href,color,bg,border,desc})=>(
                <a key={href} href={href}
                  style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,padding:'14px 8px',borderRadius:14,background:bg,border:`1px solid ${border}`,textDecoration:'none',textAlign:'center'}}>
                  <div style={{width:38,height:38,borderRadius:12,background:'white',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 1px 3px rgba(0,0,0,0.08)'}}>
                    <Icon size={18} style={{color}}/>
                  </div>
                  <div>
                    <div style={{color:'#1e293b',fontSize:11,fontWeight:600,lineHeight:1.3}}>{label}</div>
                    <div style={{color:'#94a3b8',fontSize:10,marginTop:2}}>{desc}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}