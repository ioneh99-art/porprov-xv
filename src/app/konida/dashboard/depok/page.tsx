'use client'
import { useEffect, useState } from 'react'
import { Cpu, MapPin, Users, CheckCircle, Clock, AlertTriangle, ChevronRight, Zap, Trophy } from 'lucide-react'

interface AtletItem { id:number; gender:string; status_registrasi:string; cabor_id:number; cabang_olahraga:any; nama_lengkap:string }
interface VenueItem { id:number; nama:string; klaster_id:number }

export default function DashboardDepok() {
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
      sb.from('atlet').select('id,nama_lengkap,gender,status_registrasi,cabor_id,cabang_olahraga(nama)').eq('kontingen_id',kontingen_id??0).order('nama_lengkap'),
      sb.from('venue').select('id,nama,klaster_id').eq('klaster_id',3),
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

    setData({kpi:{total,putra,putri,menunggu,siap,ditolak,pctSiap},atlet,venue:venueList??[],medali:medali??[],me})
    setLoading(false)
  }

  if(loading) return (
    <div className="flex items-center justify-center h-64">
      <div style={{width:32,height:32,border:'2px solid #0f0a1c',borderTopColor:'#7c3aed',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const {kpi,atlet,venue,medali} = data
  const ani=(d=0)=>({style:{transitionDelay:`${d}ms`},className:`transition-all duration-700 ${animIn?'opacity-100 translate-y-0':'opacity-0 translate-y-4'}`})

  const statusColor=(s:string)=>{
    if(s==='Verified'||s==='Posted') return '#7c3aed'
    if(s?.includes('Menunggu')) return '#f59e0b'
    if(s?.includes('Ditolak')) return '#ef4444'
    return '#374151'
  }
  const statusLabel=(s:string)=>{
    if(s==='Verified'||s==='Posted') return 'Siap'
    if(s?.includes('Menunggu')) return 'Tunggu'
    if(s?.includes('Ditolak')) return 'Tolak'
    return 'Draft'
  }

  return (
    <div className="space-y-4">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ══ HERO — Top-aligned minimal XL ═══════════════════════════════════ */}
      <div {...ani(0)}>
        <div className="relative overflow-hidden rounded-2xl" style={{background:'#08060f',border:'1px solid rgba(124,58,237,0.15)'}}>
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage:'linear-gradient(rgba(124,58,237,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,0.04) 1px,transparent 1px)',
            backgroundSize:'36px 36px',
            pointerEvents:'none',
          }}/>
          {/* Diagonal accent */}
          <svg className="absolute inset-0 w-full h-full" style={{opacity:0.04,pointerEvents:'none'}}>
            <line x1="0" y1="100%" x2="100%" y2="0" stroke="#7c3aed" strokeWidth="1"/>
          </svg>
          {/* Corner dots */}
          {['top-3 left-3','top-3 right-3','bottom-3 left-3','bottom-3 right-3'].map((pos,i)=>(
            <div key={i} className={`absolute w-1 h-1 rounded-full ${pos}`} style={{background:'rgba(124,58,237,0.4)'}}/>
          ))}

          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Cpu size={12} style={{color:'#7c3aed'}}/>
                  <span style={{color:'#7c3aed',fontSize:9,fontWeight:700,letterSpacing:'0.15em',textTransform:'uppercase'}}>
                    Kota Depok · Tuan Rumah Klaster III
                  </span>
                </div>
                <h1 style={{color:'white',fontSize:28,fontWeight:800,lineHeight:1.1,marginBottom:4}}>
                  Smart<br/><span style={{color:'#7c3aed'}}>Portal</span>
                </h1>
                <p style={{color:'#374151',fontSize:11}}>
                  {new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                </p>
              </div>
              {/* 3 angka jumbo */}
              <div className="flex items-end gap-6 flex-shrink-0">
                {[
                  {label:'Atlet',value:kpi.total,color:'white'},
                  {label:'Siap',value:kpi.siap,color:'#7c3aed'},
                  {label:'%',value:`${kpi.pctSiap}`,color:'#7c3aed'},
                ].map(({label,value,color})=>(
                  <div key={label} className="text-right">
                    <div style={{color,fontSize:36,fontWeight:900,lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{value}</div>
                    <div style={{color:'#374151',fontSize:9,letterSpacing:'0.1em',textTransform:'uppercase'}}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Progress bar tipis */}
            <div className="mt-4" style={{height:2,background:'rgba(124,58,237,0.1)',borderRadius:1,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${kpi.pctSiap}%`,background:'#7c3aed',transition:'width 1s ease'}}/>
            </div>
            <div style={{color:'rgba(124,58,237,0.4)',fontSize:9,marginTop:2}}>{kpi.pctSiap}% kesiapan kontingen</div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {kpi.ditolak>0&&(
        <div {...ani(50)}>
          <a href="/konida/atlet" className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{background:'rgba(220,38,38,0.05)',border:'1px solid rgba(220,38,38,0.15)'}}>
            <AlertTriangle size={12} style={{color:'#ef4444',flexShrink:0}}/>
            <span style={{color:'#fca5a5',fontSize:12,flex:1}}>{kpi.ditolak} atlet ditolak</span>
            <ChevronRight size={12} style={{color:'rgba(239,68,68,0.3)'}}/>
          </a>
        </div>
      )}

      {/* ══ 3 KPI JUMBO ══════════════════════════════════════════════════════ */}
      <div {...ani(100)} className="grid grid-cols-3 gap-3">
        {[
          {label:'Siap Tanding',value:kpi.siap,sub:`dari ${kpi.total} atlet`,color:'#7c3aed',border:'rgba(124,58,237,0.2)',bg:'rgba(124,58,237,0.06)'},
          {label:'Venue Aktif',value:venue.length,sub:'Klaster Depok',color:'#7c3aed',border:'rgba(124,58,237,0.15)',bg:'rgba(124,58,237,0.04)'},
          {label:'Menunggu',value:kpi.menunggu,sub:kpi.menunggu>0?'Perlu tindakan':'Semua lancar',color:kpi.menunggu>0?'#f59e0b':'#374151',border:kpi.menunggu>0?'rgba(245,158,11,0.2)':'rgba(55,65,81,0.15)',bg:'rgba(55,65,81,0.03)'},
        ].map(({label,value,sub,color,border,bg})=>(
          <div key={label} className="p-5 rounded-2xl" style={{background:bg,border:`1px solid ${border}`}}>
            <div style={{color,fontSize:40,fontWeight:900,lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{value}</div>
            <div style={{color:'white',fontSize:12,fontWeight:600,marginTop:4}}>{label}</div>
            <div style={{color:'#374151',fontSize:10,marginTop:2}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ══ 7 VENUE COMPACT + MEDALI ══════════════════════════════════════════ */}
      <div {...ani(150)} className="grid grid-cols-3 gap-4">

        {/* Venue compact — semua 7 muat 1 panel */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'#08060f',border:'1px solid rgba(124,58,237,0.12)'}}>
          <div className="px-5 py-3 flex items-center justify-between" style={{borderBottom:'1px solid rgba(124,58,237,0.08)'}}>
            <div className="flex items-center gap-2">
              <MapPin size={12} style={{color:'#7c3aed'}}/>
              <span style={{color:'white',fontSize:12,fontWeight:600}}>Venue Klaster III</span>
              <span style={{background:'rgba(124,58,237,0.15)',color:'#7c3aed',fontSize:10,padding:'1px 8px',borderRadius:20}}>{venue.length}</span>
            </div>
            <a href="/konida/penyelenggara/venue" style={{color:'rgba(124,58,237,0.6)',fontSize:10}} className="flex items-center gap-1">
              Detail <ChevronRight size={10}/>
            </a>
          </div>
          {/* Header tabel */}
          <div className="grid px-5 py-2" style={{gridTemplateColumns:'1fr 2fr 60px',borderBottom:'1px solid rgba(124,58,237,0.06)'}}>
            {['No','Nama Venue','Status'].map(h=>(
              <div key={h} style={{color:'#374151',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase'}}>{h}</div>
            ))}
          </div>
          <div>
            {venue.map((v:VenueItem,i:number)=>(
              <div key={v.id} className="grid px-5 py-2.5 items-center transition-colors hover:bg-purple-500/5"
                style={{gridTemplateColumns:'1fr 2fr 60px',borderBottom:i<venue.length-1?'1px solid rgba(124,58,237,0.04)':'none'}}>
                <div style={{color:'#374151',fontSize:11,fontWeight:700}}>V{String(i+1).padStart(2,'0')}</div>
                <div style={{color:'#c4b5fd',fontSize:11}} className="truncate">{v.nama}</div>
                <div>
                  <span style={{
                    fontSize:9,padding:'2px 6px',borderRadius:4,fontWeight:600,
                    background:i<3?'rgba(124,58,237,0.15)':'rgba(55,65,81,0.2)',
                    color:i<3?'#7c3aed':'#374151',
                  }}>{i<3?'Aktif':'Standby'}</span>
                </div>
              </div>
            ))}
            {venue.length===0&&(
              <div className="text-center py-8" style={{color:'#374151',fontSize:11}}>Belum ada data venue</div>
            )}
          </div>
        </div>

        {/* Medali */}
        <div className="rounded-2xl overflow-hidden" style={{background:'#08060f',border:'1px solid rgba(124,58,237,0.12)'}}>
          <div className="px-5 py-3 flex items-center gap-2" style={{borderBottom:'1px solid rgba(124,58,237,0.08)'}}>
            <Trophy size={12} style={{color:'#f59e0b'}}/>
            <span style={{color:'white',fontSize:12,fontWeight:600}}>Klasemen</span>
          </div>
          {medali.filter((m:any)=>m.total>0).length===0?(
            <div className="text-center py-8">
              <Trophy size={20} style={{color:'#1a1030',margin:'0 auto 6px'}}/>
              <div style={{color:'#374151',fontSize:11}}>Belum ada data</div>
            </div>
          ):(
            <div>
              {medali.filter((m:any)=>m.total>0).slice(0,5).map((m:any,i:number)=>(
                <div key={m.id} className="flex items-center gap-2 px-4 py-2.5" style={{borderBottom:i<4?'1px solid rgba(124,58,237,0.04)':'none'}}>
                  <span style={{fontSize:11,width:16,textAlign:'center',flexShrink:0}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{color:'#374151',fontSize:10}}>{i+1}</span>}
                  </span>
                  <span style={{color:'#a78bfa',fontSize:10,flex:1}} className="truncate">{m.kontingen?.nama}</span>
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
      </div>

      {/* ══ TABEL ATLET INLINE + SIPA ══════════════════════════════════════ */}
      <div {...ani(200)} className="grid grid-cols-3 gap-4">

        {/* Tabel atlet — eksklusif Depok */}
        <div className="col-span-2 rounded-2xl overflow-hidden" style={{background:'#08060f',border:'1px solid rgba(124,58,237,0.12)'}}>
          <div className="px-5 py-3 flex items-center justify-between" style={{borderBottom:'1px solid rgba(124,58,237,0.08)'}}>
            <div className="flex items-center gap-2">
              <Users size={12} style={{color:'#7c3aed'}}/>
              <span style={{color:'white',fontSize:12,fontWeight:600}}>Data Atlet Kontingen</span>
              <span style={{background:'rgba(124,58,237,0.15)',color:'#7c3aed',fontSize:10,padding:'1px 8px',borderRadius:20}}>{atlet.length}</span>
            </div>
            <a href="/konida/atlet" style={{color:'rgba(124,58,237,0.6)',fontSize:10}} className="flex items-center gap-1">
              Semua <ChevronRight size={10}/>
            </a>
          </div>
          <div className="grid px-5 py-2" style={{gridTemplateColumns:'2fr 1fr 60px 60px',borderBottom:'1px solid rgba(124,58,237,0.06)'}}>
            {['Nama','Cabor','Gender','Status'].map(h=>(
              <div key={h} style={{color:'#374151',fontSize:9,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase'}}>{h}</div>
            ))}
          </div>
          <div className="overflow-y-auto" style={{maxHeight:200}}>
            {atlet.slice(0,12).map((a:AtletItem,i:number)=>(
              <div key={a.id} className="grid px-5 py-2 items-center hover:bg-purple-500/5 transition-colors"
                style={{gridTemplateColumns:'2fr 1fr 60px 60px',borderBottom:'1px solid rgba(124,58,237,0.03)'}}>
                <span style={{color:'#c4b5fd',fontSize:11}} className="truncate">{a.nama_lengkap||'-'}</span>
                <span style={{color:'#4b5563',fontSize:10}} className="truncate">{(a.cabang_olahraga as any)?.nama||'-'}</span>
                <span style={{color:a.gender==='L'?'#60a5fa':'#f472b6',fontSize:10}}>{a.gender==='L'?'Putra':'Putri'}</span>
                <span style={{fontSize:9,padding:'2px 5px',borderRadius:4,fontWeight:600,background:`${statusColor(a.status_registrasi)}15`,color:statusColor(a.status_registrasi)}}>
                  {statusLabel(a.status_registrasi)}
                </span>
              </div>
            ))}
            {atlet.length===0&&(
              <div className="text-center py-6" style={{color:'#374151',fontSize:11}}>Belum ada data atlet</div>
            )}
          </div>
        </div>

        {/* SIPA */}
        <div className="relative rounded-2xl overflow-hidden"
          style={{background:'#080f0a',border:'1px solid rgba(16,185,129,0.2)'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#10b981,transparent)'}}/>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.3)'}}>
                <Zap size={16} style={{color:'#10b981'}}/>
              </div>
              <div>
                <div style={{color:'white',fontWeight:700,fontSize:12}}>SIPA Intelligence</div>
                <div style={{fontSize:9,color:'#10b981'}}>● Groq AI · Online</div>
              </div>
            </div>
            <p style={{color:'#4b5563',fontSize:11,marginBottom:12,lineHeight:1.5}}>
              AI analitik untuk kontingen & operasional Depok
            </p>
            <div className="space-y-2 mb-4">
              {['Atlet Depok yang belum verified?','Venue Depok mana yang aktif?','Progres registrasi terkini?'].map(q=>(
                <a key={q} href="/konida/sipa"
                  className="flex items-start gap-2 p-2 rounded-lg transition-all"
                  style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',textDecoration:'none'}}>
                  <span style={{color:'rgba(124,58,237,0.6)',fontSize:10,flexShrink:0}}>→</span>
                  <span style={{color:'#4b5563',fontSize:10,lineHeight:1.4}}>{q}</span>
                </a>
              ))}
            </div>
            <a href="/konida/sipa" className="flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white"
              style={{background:'linear-gradient(135deg,#10b981,#059669)'}}>
              <Zap size={12}/> Buka SIPA
            </a>
          </div>
        </div>
      </div>

    </div>
  )

}