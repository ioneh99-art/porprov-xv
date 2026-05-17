'use client'
import { useEffect, useState } from 'react'
import { Leaf, MapPin, Users, CheckCircle, Clock, AlertTriangle, ChevronRight, Zap, Trophy, Target, Cloud } from 'lucide-react'

interface AtletItem { gender:string; status_registrasi:string; cabor_id:number; cabang_olahraga:any }

function PieChart({ segments, size=80, label, sublabel }: {
  segments:{value:number;color:string}[]; size?:number; label?:string; sublabel?:string
}) {
  const total=segments.reduce((a,b)=>a+b.value,0)
  if(total===0) return <svg width={size} height={size} viewBox="0 0 80 80"><circle cx="40" cy="40" r="28" fill="none" stroke="#0d1f11" strokeWidth="12"/></svg>
  let cum=0
  const paths=segments.filter(s=>s.value>0).map((seg,i)=>{
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
      <svg width={size} height={size} viewBox="0 0 80 80">{paths}<circle cx="40" cy="40" r="17" fill="#060f09"/></svg>
      {label&&<div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span style={{color:'white',fontWeight:700,fontSize:12,lineHeight:1}}>{label}</span>
        {sublabel&&<span style={{color:'#374151',fontSize:9,marginTop:1}}>{sublabel}</span>}
      </div>}
    </div>
  )
}

export default function DashboardBogor() {
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

    const [{data:atletAll},{data:venueList},{data:medali}] = await Promise.all([
      sb.from('atlet').select('id,gender,status_registrasi,cabor_id,cabang_olahraga(nama)').eq('kontingen_id',kontingen_id??0),
      sb.from('venue').select('id,nama,alamat,klaster_id').eq('klaster_id',2),
      sb.from('klasemen_medali').select('*,kontingen(nama)').order('emas',{ascending:false}).limit(5),
    ])

    const atlet=atletAll??[]
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

    setData({kpi:{total,putra,putri,menunggu,siap,ditolak,pctSiap},venue:venueList??[],medali:medali??[],perCabor,me})
    setLoading(false)
  }

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{width:32,height:32,border:'2px solid #0d1f11',borderTopColor:'#16a34a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const {kpi,venue,medali,perCabor} = data
  const ani=(d=0)=>({style:{transitionDelay:`${d}ms`},className:`transition-all duration-700 ${animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}`})

  return (
    <div className="space-y-4">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ══ HERO — Full-width card dengan ornamen daun ══════════════════════ */}
      <div {...ani(0)}>
        <div className="relative overflow-hidden rounded-2xl" style={{background:'#060f09',border:'1px solid rgba(22,163,74,0.15)'}}>
          {/* Ornamen daun SVG kanan atas */}
          <svg className="absolute" style={{top:-10,right:20,opacity:0.08,pointerEvents:'none'}} width="140" height="140" viewBox="0 0 120 120">
            <path d="M60 10 C60 10,100 30,100 70 C100 90,80 110,60 110 C60 110,60 60,20 40 C20 40,40 10,60 10Z" fill="#16a34a"/>
            <line x1="60" y1="10" x2="60" y2="110" stroke="#16a34a" strokeWidth="1.5"/>
            <line x1="60" y1="40" x2="90" y2="55" stroke="#16a34a" strokeWidth="1"/>
            <line x1="60" y1="60" x2="85" y2="75" stroke="#16a34a" strokeWidth="1"/>
          </svg>
          <svg className="absolute" style={{bottom:10,left:10,opacity:0.05,pointerEvents:'none',transform:'rotate(-20deg)'}} width="80" height="80" viewBox="0 0 120 120">
            <path d="M60 10 C60 10,100 30,100 70 C100 90,80 110,60 110 C60 110,60 60,20 40 C20 40,40 10,60 10Z" fill="#16a34a"/>
          </svg>

          {/* Border kiri hijau tebal */}
          <div style={{position:'absolute',left:0,top:0,bottom:0,width:4,background:'linear-gradient(180deg,transparent,#16a34a,transparent)'}}/>

          <div className="relative pl-8 pr-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Leaf size={13} style={{color:'#16a34a'}}/>
                  <span style={{color:'#16a34a',fontSize:10,fontWeight:600,letterSpacing:'0.1em',textTransform:'uppercase'}}>
                    Tuan Rumah Klaster II
                  </span>
                </div>
                <h1 style={{color:'white',fontSize:20,fontWeight:700,marginBottom:2}}>Dashboard Kota Bogor</h1>
                <p style={{color:'#4b5563',fontSize:12}}>
                  {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                </p>
                {/* Quote */}
                <div className="mt-3 pl-3" style={{borderLeft:'2px solid rgba(22,163,74,0.4)'}}>
                  <p style={{color:'#6b7280',fontSize:11,fontStyle:'italic'}}>Dari Kota Hujan, juara-juara terbaik Jawa Barat berjaya</p>
                </div>
              </div>
              {/* Stats kanan */}
              <div className="flex-shrink-0 grid grid-cols-3 gap-3">
                {[
                  {label:'Total Atlet',value:kpi.total,color:'#86efac'},
                  {label:'Siap Tanding',value:kpi.siap,color:'#16a34a'},
                  {label:'Kesiapan',value:`${kpi.pctSiap}%`,color:'#16a34a'},
                ].map(({label,value,color})=>(
                  <div key={label} className="text-center p-3 rounded-2xl"
                    style={{background:'rgba(22,163,74,0.08)',border:'1px solid rgba(22,163,74,0.15)'}}>
                    <div style={{color,fontSize:22,fontWeight:800,lineHeight:1}}>{value}</div>
                    <div style={{color:'#374151',fontSize:9,marginTop:3}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {kpi.ditolak>0&&(
        <div {...ani(50)}>
          <a href="/konida/atlet" className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
            style={{background:'rgba(220,38,38,0.05)',border:'1px solid rgba(220,38,38,0.15)'}}>
            <AlertTriangle size={13} style={{color:'#ef4444',flexShrink:0}}/>
            <span style={{color:'#fca5a5',fontSize:12,flex:1}}>{kpi.ditolak} atlet ditolak — perlu direvisi</span>
            <ChevronRight size={12} style={{color:'rgba(239,68,68,0.4)'}}/>
          </a>
        </div>
      )}

      {/* ══ KPI — 4 card rounded organik ══════════════════════════════════ */}
      <div {...ani(100)} className="grid grid-cols-4 gap-3">
        {[
          {label:'Total Atlet',value:kpi.total,sub:`${kpi.putra}L · ${kpi.putri}P`,icon:Users,color:'#16a34a',border:'rgba(22,163,74,0.2)',bg:'rgba(22,163,74,0.06)'},
          {label:'Siap Tanding',value:kpi.siap,sub:`${kpi.pctSiap}% dari total`,icon:CheckCircle,color:'#10b981',border:'rgba(16,185,129,0.2)',bg:'rgba(16,185,129,0.06)'},
          {label:'Venue Aktif',value:venue.length,sub:'Klaster Bogor',icon:MapPin,color:'#16a34a',border:'rgba(22,163,74,0.2)',bg:'rgba(22,163,74,0.06)'},
          {label:'Menunggu',value:kpi.menunggu,sub:kpi.menunggu>0?'Perlu tindakan':'Semua lancar',icon:Clock,color:kpi.menunggu>0?'#f59e0b':'#374151',border:kpi.menunggu>0?'rgba(245,158,11,0.2)':'rgba(55,65,81,0.2)',bg:kpi.menunggu>0?'rgba(245,158,11,0.05)':'rgba(55,65,81,0.03)'},
        ].map(({label,value,sub,icon:Icon,color,border,bg})=>(
          <div key={label} className="p-4 rounded-2xl" style={{background:bg,border:`1px solid ${border}`}}>
            <div className="flex items-start justify-between mb-3">
              <Icon size={14} style={{color}}/>
              <div className="w-1.5 h-1.5 rounded-full mt-1" style={{background:color,opacity:0.6}}/>
            </div>
            <div style={{color:'white',fontSize:26,fontWeight:800,lineHeight:1,marginBottom:2}}>{value}</div>
            <div style={{color:color,fontSize:11,fontWeight:500,marginBottom:1}}>{label}</div>
            <div style={{color:'#374151',fontSize:10}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ══ VENUE LIST + PIE ═══════════════════════════════════════════════ */}
      <div {...ani(150)} className="grid grid-cols-3 gap-4">

        {/* Venue list — natural style */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'#060f09',border:'1px solid rgba(22,163,74,0.12)'}}>
          <div className="px-5 py-3.5 flex items-center justify-between" style={{borderBottom:'1px solid rgba(22,163,74,0.1)'}}>
            <div className="flex items-center gap-2">
              <MapPin size={13} style={{color:'#16a34a'}}/>
              <span style={{color:'white',fontSize:13,fontWeight:600}}>Venue Klaster Bogor</span>
              <span className="px-2 py-0.5 rounded-full" style={{background:'rgba(22,163,74,0.15)',color:'#16a34a',fontSize:10,fontWeight:600}}>
                {venue.length} venue
              </span>
            </div>
            <a href="/konida/penyelenggara/venue" style={{color:'#16a34a',fontSize:11}} className="flex items-center gap-1">
              Semua <ChevronRight size={11}/>
            </a>
          </div>
          <div className="divide-y" >
            {venue.slice(0,7).map((v:any,i:number)=>(
              <div key={v.id} className="flex items-center gap-4 px-5 py-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:i<2?'rgba(22,163,74,0.15)':'rgba(255,255,255,0.03)',border:i<2?'1px solid rgba(22,163,74,0.25)':'1px solid rgba(255,255,255,0.04)'}}>
                  <MapPin size={13} style={{color:i<2?'#16a34a':'#374151'}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{color:'#d1fae5',fontSize:12,fontWeight:500}} className="truncate">{v.nama}</div>
                  <div style={{color:'#374151',fontSize:10}} className="truncate">{v.alamat||'Kota Bogor'}</div>
                </div>
                {/* Simulated weather */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Cloud size={11} style={{color:'#4b5563'}}/>
                  <span style={{color:'#4b5563',fontSize:10}}>{24+i}°C</span>
                </div>
                <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{background:i<2?'rgba(22,163,74,0.15)':'rgba(55,65,81,0.2)'}}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{background:i<2?'#16a34a':'#374151'}}/>
                </div>
              </div>
            ))}
            {venue.length>7&&(
              <div className="px-5 py-2.5 text-center">
                <span style={{color:'#16a34a',fontSize:10}}>+{venue.length-7} venue lainnya</span>
              </div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="space-y-3">
          <div className="rounded-2xl p-4" style={{background:'#060f09',border:'1px solid rgba(22,163,74,0.12)'}}>
            <div style={{color:'#4b5563',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Status Registrasi</div>
            <div className="flex items-center gap-3">
              <PieChart size={72} label={`${kpi.pctSiap}%`} sublabel="Siap"
                segments={[
                  {value:kpi.siap,color:'#16a34a'},
                  {value:kpi.menunggu,color:'#f59e0b'},
                  {value:kpi.ditolak,color:'#374151'},
                ]}/>
              <div className="flex-1 space-y-1.5">
                {[
                  {label:'Siap',value:kpi.siap,color:'#16a34a'},
                  {label:'Menunggu',value:kpi.menunggu,color:'#f59e0b'},
                  {label:'Ditolak',value:kpi.ditolak,color:'#374151'},
                ].map(({label,value,color})=>(
                  <div key={label} className="flex justify-between">
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

          <div className="rounded-2xl p-4" style={{background:'#060f09',border:'1px solid rgba(22,163,74,0.12)'}}>
            <div style={{color:'#4b5563',fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:10}}>Top Cabor</div>
            <div className="space-y-2">
              {perCabor.map((c:any,i:number)=>(
                <div key={c.nama}>
                  <div className="flex justify-between mb-1">
                    <span style={{color:'#6b7280',fontSize:10}} className="truncate flex-1">{c.nama}</span>
                    <span style={{color:'#16a34a',fontSize:10,fontWeight:700,marginLeft:4}}>{c.total}</span>
                  </div>
                  <div style={{height:3,background:'#0d1f11',borderRadius:2,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${(c.total/perCabor[0].total)*100}%`,background:'#16a34a',borderRadius:2,opacity:1-i*0.15}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ MEDALI + SIPA ══════════════════════════════════════════════════ */}
      <div {...ani(200)} className="grid grid-cols-3 gap-4">

        {/* Medali */}
        <div className="rounded-2xl overflow-hidden" style={{background:'#060f09',border:'1px solid rgba(22,163,74,0.12)'}}>
          <div className="px-5 py-3.5 flex items-center gap-2" style={{borderBottom:'1px solid rgba(22,163,74,0.1)'}}>
            <Trophy size={13} style={{color:'#f59e0b'}}/>
            <span style={{color:'white',fontSize:13,fontWeight:600}}>Klasemen Medali</span>
          </div>
          {medali.filter((m:any)=>m.total>0).length===0?(
            <div className="text-center py-8">
              <Trophy size={22} style={{color:'#0d1f11',margin:'0 auto 6px'}}/>
              <div style={{color:'#374151',fontSize:11}}>Belum ada data</div>
            </div>
          ):(
            <div className="divide-y" >
              {medali.filter((m:any)=>m.total>0).slice(0,5).map((m:any,i:number)=>(
                <div key={m.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span style={{fontSize:12,width:18,textAlign:'center',flexShrink:0}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{color:'#374151'}}>{i+1}</span>}
                  </span>
                  <span style={{color:'#9ca3af',fontSize:11,flex:1}} className="truncate">{m.kontingen?.nama}</span>
                  <div className="flex gap-1">
                    <span style={{color:'#f59e0b',fontSize:10,fontWeight:700}}>{m.emas}</span>
                    <span style={{color:'#6b7280',fontSize:10}}>{m.perak}</span>
                    <span style={{color:'#78350f',fontSize:10}}>{m.perunggu}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SIPA */}
        <div className="col-span-2 relative rounded-2xl overflow-hidden"
          style={{background:'#080f0a',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#10b981,transparent)'}}/>
          <div className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)'}}>
              <Zap size={18} style={{color:'#10b981'}}/>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{color:'white',fontWeight:700,fontSize:13}}>SIPA Intelligence</span>
                <span style={{fontSize:9,padding:'2px 8px',borderRadius:20,background:'rgba(16,185,129,0.15)',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>● Online</span>
              </div>
              <p style={{color:'#4b5563',fontSize:11,marginBottom:8}}>AI analitik operasional Bogor</p>
              <div className="flex gap-2 flex-wrap">
                {['Venue outdoor mana yang paling siap?','Cabor atletik Bogor berapa atlet?','Status kesiapan Stadion Padjajaran?'].map(q=>(
                  <a key={q} href="/konida/sipa" style={{fontSize:10,padding:'4px 10px',borderRadius:8,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',color:'#6b7280',textDecoration:'none'}}>
                    → {q}
                  </a>
                ))}
              </div>
            </div>
            <a href="/konida/sipa" className="flex items-center gap-1.5 text-xs font-semibold text-white px-4 py-2 rounded-xl flex-shrink-0"
              style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
              Buka <ChevronRight size={12}/>
            </a>
          </div>
        </div>
      </div>

    </div>
  )
}