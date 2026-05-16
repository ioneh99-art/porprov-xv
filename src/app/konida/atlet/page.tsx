'use client'

// Menu Atlet Kota Bekasi — PORPROV XV
// Alert bar di atas, detail lengkap per atlet, fasilitas & peruntukan
// src/app/konida/atlet/page.tsx

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, Award, BedDouble,
  Calendar, Car, CheckCircle, ChevronDown,
  Clock, Download, Edit3, Eye, Filter,
  Loader2, Medal, Phone, Plus, RefreshCw,
  Search, Shield, Star, Stethoscope, Target,
  TrendingUp, Upload, User, Users, Utensils,
  Wifi, X, XCircle, Zap, FileText,
  Bell,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────
type StatusKual   = 'lolos' | 'pending' | 'tidak_lolos' | 'cadangan'
type StatusVerif  = 'verified' | 'pending' | 'revisi' | 'ditolak'
type Gender       = 'L' | 'P'
type StatusAtlet  = 'aktif' | 'cedera' | 'standby' | 'selesai'

interface Fasilitas {
  akomodasi: string         // hotel / wisma
  kamar: string
  konsumsi: string          // 3x/hari, vegetarian, dll
  transport: string         // bus, pribadi
  seragam: boolean
  p3k: boolean
  pendamping?: string
}

interface Atlet {
  id: number
  nama: string
  nik?: string
  gender: Gender
  tgl_lahir: string
  cabor: string
  cabor_id: number
  nomor_pertandingan: string[]
  status_kual: StatusKual
  status_verif: StatusVerif
  status_atlet: StatusAtlet
  nilai_kual?: number
  medali_emas: number
  medali_perak: number
  medali_perunggu: number
  prestasi_tertinggi?: string
  kontingen: string
  telp?: string
  foto?: string
  fasilitas: Fasilitas
  jadwal_terdekat?: string
  catatan?: string
  alert?: string
}

interface AlertBar {
  id: number
  tipe: 'warning' | 'info' | 'success' | 'danger'
  judul: string
  pesan: string
  waktu: string
  atlet_id?: number
}

// ─── Mock Data ────────────────────────────────────────────
const MOCK_ALERTS: AlertBar[] = [
  { id:1, tipe:'danger',  judul:'Cedera!',          pesan:'Rizky Pratama — nyeri otot hamstring kanan, dilarang tanding sementara', waktu:'14:22', atlet_id:1 },
  { id:2, tipe:'warning', judul:'Belum Check-In',   pesan:'3 atlet Pencak Silat belum check-in ke wisma — tanding besok 08:00', waktu:'13:45' },
  { id:3, tipe:'success', judul:'🥇 Emas!',          pesan:'Rina Melati meraih medali emas Karate Kata Putri — selamat!', waktu:'13:05', atlet_id:7 },
  { id:4, tipe:'info',    judul:'Jadwal Final',      pesan:'Kevin Santoso — Tunggal Putra Final BT: besok 09:00 GOR Cyber Park', waktu:'12:30', atlet_id:3 },
  { id:5, tipe:'warning', judul:'Konsumsi Kurang',   pesan:'Stok konsumsi atlet renang habis — koordinasi ke panitia logistik', waktu:'11:50' },
]

const MOCK_ATLETS: Atlet[] = [
  {
    id:1, nama:'Rizky Pratama', nik:'3275010101990001', gender:'L', tgl_lahir:'1999-01-01',
    cabor:'Atletik', cabor_id:1, nomor_pertandingan:['100m Putra','200m Putra'],
    status_kual:'lolos', status_verif:'verified', status_atlet:'cedera',
    nilai_kual:92, medali_emas:0, medali_perak:1, medali_perunggu:0,
    prestasi_tertinggi:'Perak Kejurnas 2024', kontingen:'Kota Bekasi', telp:'0812-1111-0001',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'3A-12', konsumsi:'3x/hari', transport:'Bus Kontingen', seragam:true, p3k:true, pendamping:'Kang Andi (Pelatih)' },
    jadwal_terdekat:'Semifinal 100m — Besok 10:00',
    alert:'⚠ Cedera hamstring — perlu clearance dokter sebelum tanding',
  },
  {
    id:2, nama:'Maya Sari', nik:'3275020202000002', gender:'P', tgl_lahir:'2000-02-02',
    cabor:'Atletik', cabor_id:1, nomor_pertandingan:['400m Putri','Lompat Jauh Putri'],
    status_kual:'lolos', status_verif:'verified', status_atlet:'aktif',
    nilai_kual:88, medali_emas:0, medali_perak:1, medali_perunggu:1,
    prestasi_tertinggi:'Perak Porprov 2022', kontingen:'Kota Bekasi', telp:'0813-2222-0002',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'3A-13', konsumsi:'3x/hari (diet tinggi protein)', transport:'Bus Kontingen', seragam:true, p3k:true },
    jadwal_terdekat:'Final Lompat Jauh — Hari ini 16:30',
  },
  {
    id:3, nama:'Kevin Santoso', nik:'3275030303010003', gender:'L', tgl_lahir:'2001-03-03',
    cabor:'Bulu Tangkis', cabor_id:3, nomor_pertandingan:['Tunggal Putra','Ganda Campuran'],
    status_kual:'lolos', status_verif:'verified', status_atlet:'aktif',
    nilai_kual:97, medali_emas:1, medali_perak:0, medali_perunggu:1,
    prestasi_tertinggi:'Emas Kejurnas U-23 2024', kontingen:'Kota Bekasi', telp:'0814-3333-0003',
    fasilitas:{ akomodasi:'Novotel Bekasi', kamar:'504', konsumsi:'3x/hari + suplemen', transport:'Antar-jemput khusus', seragam:true, p3k:true, pendamping:'Bu Ira (Manajer Tim)' },
    jadwal_terdekat:'Final Tunggal Putra — Besok 09:00',
  },
  {
    id:4, nama:'Aldo Setiawan', nik:'3275040404000004', gender:'L', tgl_lahir:'2000-04-04',
    cabor:'Renang', cabor_id:2, nomor_pertandingan:['100m Gaya Bebas','50m Gaya Bebas','4x100 Relay'],
    status_kual:'lolos', status_verif:'verified', status_atlet:'aktif',
    nilai_kual:95, medali_emas:2, medali_perak:1, medali_perunggu:0,
    prestasi_tertinggi:'Emas 2x Kejurnas Renang 2024', kontingen:'Kota Bekasi', telp:'0815-4444-0004',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'2B-05', konsumsi:'3x/hari + diet renang khusus', transport:'Bus Kontingen', seragam:true, p3k:true },
    jadwal_terdekat:'Heat 100m GayaBebas — Hari ini 14:45',
  },
  {
    id:5, nama:'Rina Melati', nik:'3275050505010005', gender:'P', tgl_lahir:'2001-05-05',
    cabor:'Karate', cabor_id:7, nomor_pertandingan:['Kata Putri','Kumite -55kg'],
    status_kual:'lolos', status_verif:'verified', status_atlet:'aktif',
    nilai_kual:94, medali_emas:1, medali_perak:1, medali_perunggu:0,
    prestasi_tertinggi:'Emas Karate Nasional 2024', kontingen:'Kota Bekasi', telp:'0816-5555-0005',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'2A-08', konsumsi:'3x/hari', transport:'Bus Kontingen', seragam:true, p3k:true },
    jadwal_terdekat:'Kumite -55kg — Besok 13:00',
  },
  {
    id:6, nama:'Sari Dewi', nik:'3275060606020006', gender:'P', tgl_lahir:'2002-06-06',
    cabor:'Taekwondo', cabor_id:8, nomor_pertandingan:['Kelas 63kg Putri'],
    status_kual:'lolos', status_verif:'verified', status_atlet:'aktif',
    nilai_kual:86, medali_emas:0, medali_perak:0, medali_perunggu:1,
    kontingen:'Kota Bekasi', telp:'0817-6666-0006',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'1C-04', konsumsi:'3x/hari', transport:'Bus Kontingen', seragam:true, p3k:true },
    jadwal_terdekat:'Final 63kg Putri — Hari ini 15:00',
  },
  {
    id:7, nama:'Agus Rahmat', nik:'3275070707990007', gender:'L', tgl_lahir:'1999-07-07',
    cabor:'Pencak Silat', cabor_id:4, nomor_pertandingan:['Kelas C Putra','Seni Tunggal Putra'],
    status_kual:'lolos', status_verif:'pending', status_atlet:'aktif',
    nilai_kual:79, medali_emas:0, medali_perak:1, medali_perunggu:2,
    kontingen:'Kota Bekasi', telp:'0818-7777-0007',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'1A-11', konsumsi:'3x/hari', transport:'Bus Kontingen', seragam:true, p3k:false },
    catatan:'Verifikasi prestasi masih pending — upload SK kejuaraan',
    alert:'Verifikasi belum selesai — upload dokumen segera',
  },
  {
    id:8, nama:'Dani Kusuma', nik:'3275080808030008', gender:'L', tgl_lahir:'2003-08-08',
    cabor:'Atletik', cabor_id:1, nomor_pertandingan:['400m Putra'],
    status_kual:'cadangan', status_verif:'verified', status_atlet:'standby',
    nilai_kual:74, medali_emas:0, medali_perak:0, medali_perunggu:0,
    kontingen:'Kota Bekasi', telp:'0819-8888-0008',
    fasilitas:{ akomodasi:'Wisma Atlet Bekasi', kamar:'3B-07', konsumsi:'3x/hari', transport:'Bus Kontingen', seragam:true, p3k:true },
    catatan:'Cadangan untuk 400m Putra — siap jika atlet utama cedera',
  },
]

// ─── Config ───────────────────────────────────────────────
const KUAL_CONF: Record<StatusKual, { label:string; color:string; bg:string; border:string; icon:any }> = {
  lolos:       { label:'Lolos',       color:'text-green-700',  bg:'bg-green-50',  border:'border-green-200', icon:CheckCircle },
  pending:     { label:'Pending',     color:'text-orange-700', bg:'bg-orange-50', border:'border-orange-200',icon:Clock },
  tidak_lolos: { label:'Tidak Lolos', color:'text-red-700',    bg:'bg-red-50',    border:'border-red-200',   icon:XCircle },
  cadangan:    { label:'Cadangan',    color:'text-blue-700',   bg:'bg-blue-50',   border:'border-blue-200',  icon:AlertTriangle },
}
const ATLET_STATUS: Record<StatusAtlet, { label:string; color:string; bg:string; dot:string }> = {
  aktif:   { label:'Aktif',   color:'text-green-700',  bg:'bg-green-50',  dot:'bg-green-500'  },
  cedera:  { label:'Cedera',  color:'text-red-700',    bg:'bg-red-50',    dot:'bg-red-500'    },
  standby: { label:'Standby', color:'text-orange-700', bg:'bg-orange-50', dot:'bg-orange-500' },
  selesai: { label:'Selesai', color:'text-gray-500',   bg:'bg-gray-100',  dot:'bg-gray-400'   },
}
const ALERT_CONF = {
  danger:  { bg:'bg-red-50',    border:'border-red-200',    text:'text-red-800',    icon: AlertTriangle, iconColor:'text-red-500'   },
  warning: { bg:'bg-orange-50', border:'border-orange-200', text:'text-orange-800', icon: AlertTriangle, iconColor:'text-orange-500' },
  success: { bg:'bg-green-50',  border:'border-green-200',  text:'text-green-800',  icon: CheckCircle,   iconColor:'text-green-600'  },
  info:    { bg:'bg-blue-50',   border:'border-blue-200',   text:'text-blue-800',   icon: Zap,           iconColor:'text-blue-500'   },
}

// ─── Fasilitas Badge ──────────────────────────────────────
function FasilitasBadge({ icon: Icon, label, value, color = 'text-gray-600' }: { icon: any; label: string; value: string | boolean; color?: string }) {
  if (value === false) return null
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
      <Icon size={11} className={color} />
      <div>
        <div className="text-[9px] text-gray-400">{label}</div>
        <div className="text-[10px] font-semibold text-[#3c4858]">{value === true ? '✓ Tersedia' : String(value)}</div>
      </div>
    </div>
  )
}

// ─── Atlet Detail Card ────────────────────────────────────
function AtletCard({ atlet, onEdit }: { atlet: Atlet; onEdit: (a: Atlet) => void }) {
  const [expanded, setExpanded] = useState(false)
  const kual = KUAL_CONF[atlet.status_kual]
  const status = ATLET_STATUS[atlet.status_atlet]
  const totalMedali = atlet.medali_emas + atlet.medali_perak + atlet.medali_perunggu

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${
      atlet.status_atlet === 'cedera' ? 'border-red-200 bg-red-50/30' : 'border-gray-100 hover:shadow-md'
    }`}>
      {/* Alert strip */}
      {atlet.alert && (
        <div className="bg-red-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-t-xl flex items-center gap-2">
          <AlertTriangle size={10} /> {atlet.alert}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-black text-lg ${
            atlet.gender === 'L' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-pink-400 to-pink-600'
          }`}>
            {atlet.nama.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#3c4858] text-sm">{atlet.nama}</h3>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${atlet.gender==='L'?'bg-blue-50 text-blue-600':'bg-pink-50 text-pink-600'}`}>
                    {atlet.gender==='L'?'♂':'♀'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{atlet.cabor} · {atlet.kontingen}</div>
                {atlet.telp && <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5"><Phone size={9}/>{atlet.telp}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${status.bg} ${status.color}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${status.dot} ${atlet.status_atlet==='aktif'?'animate-pulse':''}`} />
                  {status.label}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${kual.bg} ${kual.color} ${kual.border}`}>
                  <kual.icon size={9}/> {kual.label}
                </span>
                <button onClick={() => onEdit(atlet)} className="w-7 h-7 bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-center">
                  <Edit3 size={12} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* Nomor Pertandingan */}
            <div className="flex flex-wrap gap-1 mt-2">
              {atlet.nomor_pertandingan.map(n => (
                <span key={n} className="text-[10px] bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{n}</span>
              ))}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex gap-2 text-sm">
                <span className="text-yellow-600 font-bold">🥇{atlet.medali_emas}</span>
                <span className="text-gray-400 font-bold">🥈{atlet.medali_perak}</span>
                <span className="text-orange-500 font-bold">🥉{atlet.medali_perunggu}</span>
              </div>
              {atlet.nilai_kual && (
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Target size={11}/> Nilai: <span className={`font-bold ${atlet.nilai_kual>=90?'text-green-600':atlet.nilai_kual>=75?'text-blue-600':'text-orange-500'}`}>{atlet.nilai_kual}</span>
                </div>
              )}
              {atlet.jadwal_terdekat && (
                <div className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
                  <Calendar size={10}/> {atlet.jadwal_terdekat}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(p => !p)}
          className="mt-3 w-full flex items-center justify-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-600 py-1 border-t border-gray-50"
        >
          {expanded ? <><ChevronDown size={11} className="rotate-180"/> Sembunyikan detail</> : <><ChevronDown size={11}/> Lihat fasilitas & detail lengkap</>}
        </button>

        {/* Expanded Detail */}
        {expanded && (
          <div className="mt-3 space-y-4 border-t border-gray-50 pt-3">
            {/* Fasilitas */}
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Fasilitas & Peruntukan</div>
              <div className="grid grid-cols-3 gap-2">
                <FasilitasBadge icon={BedDouble}    label="Akomodasi"   value={atlet.fasilitas.akomodasi}  color="text-purple-500" />
                <FasilitasBadge icon={Utensils}     label="Konsumsi"    value={atlet.fasilitas.konsumsi}   color="text-orange-500" />
                <FasilitasBadge icon={Car}          label="Transport"   value={atlet.fasilitas.transport}  color="text-blue-500"   />
                <FasilitasBadge icon={BedDouble}    label="Kamar"       value={atlet.fasilitas.kamar}      color="text-gray-500"   />
                <FasilitasBadge icon={Shield}       label="Seragam"     value={atlet.fasilitas.seragam}    color="text-green-500"  />
                <FasilitasBadge icon={Stethoscope}  label="P3K"         value={atlet.fasilitas.p3k}        color="text-red-500"    />
                {atlet.fasilitas.pendamping && (
                  <div className="col-span-3">
                    <FasilitasBadge icon={User} label="Pendamping/Pelatih" value={atlet.fasilitas.pendamping} color="text-cyan-500" />
                  </div>
                )}
              </div>
            </div>

            {/* Prestasi tertinggi */}
            {atlet.prestasi_tertinggi && (
              <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                <Star size={12} className="text-yellow-500 flex-shrink-0" />
                <span className="text-[10px] font-medium text-yellow-700">Prestasi Terbaik: {atlet.prestasi_tertinggi}</span>
              </div>
            )}

            {/* Catatan */}
            {atlet.catatan && (
              <div className="flex items-start gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                <FileText size={11} className="text-gray-400 flex-shrink-0 mt-0.5" />
                <span className="text-[10px] text-gray-500 italic">{atlet.catatan}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────
export default function MenuAtletBekasi() {
  const [search, setSearch] = useState('')
  const [filterCabor, setFilterCabor] = useState('semua')
  const [filterStatus, setFilterStatus] = useState<StatusAtlet | 'semua'>('semua')
  const [filterKual, setFilterKual] = useState<StatusKual | 'semua'>('semua')
  const [filterGender, setFilterGender] = useState<Gender | 'semua'>('semua')
  const [animIn, setAnimIn] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([])

  useEffect(() => { const t = setTimeout(() => setAnimIn(true), 80); return () => clearTimeout(t) }, [])

  const cabors = useMemo(() => ['semua', ...Array.from(new Set(MOCK_ATLETS.map(a => a.cabor)))], [])

  const filtered = useMemo(() => {
    let r = MOCK_ATLETS
    if (search)              r = r.filter(a => a.nama.toLowerCase().includes(search.toLowerCase()) || a.cabor.toLowerCase().includes(search.toLowerCase()))
    if (filterCabor !== 'semua')  r = r.filter(a => a.cabor === filterCabor)
    if (filterStatus !== 'semua') r = r.filter(a => a.status_atlet === filterStatus)
    if (filterKual !== 'semua')   r = r.filter(a => a.status_kual === filterKual)
    if (filterGender !== 'semua') r = r.filter(a => a.gender === filterGender)
    return r
  }, [MOCK_ATLETS, search, filterCabor, filterStatus, filterKual, filterGender])

  const summary = useMemo(() => ({
    total:    MOCK_ATLETS.length,
    aktif:    MOCK_ATLETS.filter(a => a.status_atlet === 'aktif').length,
    cedera:   MOCK_ATLETS.filter(a => a.status_atlet === 'cedera').length,
    lolos:    MOCK_ATLETS.filter(a => a.status_kual === 'lolos').length,
    totalEmas:MOCK_ATLETS.reduce((a,x) => a + x.medali_emas, 0),
    pending:  MOCK_ATLETS.filter(a => a.status_verif === 'pending').length,
  }), [])

  const activeAlerts = MOCK_ALERTS.filter(a => !dismissedAlerts.includes(a.id))

  const ani = (d = 0) => ({
    style: { transitionDelay:`${d}ms`, transition:'all 0.6s ease' },
    className: animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
  })

  return (
    <div className="min-h-screen bg-[#eeeeee] p-8 font-sans space-y-6">

      {/* ─── Header ─── */}
      <div {...ani(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-[#3c4858]">Data Atlet</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manajemen atlet, fasilitas & peruntukan · Kontingen Kota Bekasi PORPROV XV</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-full text-sm text-gray-600 flex items-center gap-2 shadow-sm">
            <Download size={14} /> Export
          </button>
          <Link href="/konida/atlet/tambah" className="bg-gradient-to-r from-[#E84E0F] to-orange-500 text-white px-4 py-2 rounded-full text-sm flex items-center gap-2 shadow-md">
            <Plus size={14} /> Tambah Atlet
          </Link>
        </div>
      </div>

      {/* ─── ALERT BAR ─── */}
      {activeAlerts.length > 0 && (
        <div {...ani(20)} className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Bell size={14} className="text-[#E84E0F]" />
            <span className="text-xs font-bold text-[#3c4858] uppercase tracking-wider">Alert Atlet</span>
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{activeAlerts.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {activeAlerts.map(al => {
              const conf = ALERT_CONF[al.tipe]
              return (
                <div key={al.id}
                  className={`flex items-start gap-4 px-5 py-3 rounded-xl border shadow-sm ${conf.bg} ${conf.border}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/60`}>
                    <conf.icon size={16} className={conf.iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-bold ${conf.text}`}>{al.judul}</div>
                    <div className={`text-xs mt-0.5 ${conf.text} opacity-80`}>{al.pesan}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] text-gray-400 font-mono">{al.waktu} WIB</span>
                    <button onClick={() => setDismissedAlerts(p => [...p, al.id])}
                      className="text-gray-300 hover:text-gray-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── KPI ─── */}
      <div {...ani(40)} className="grid grid-cols-6 gap-4">
        {[
          { label:'Total Atlet',   value:summary.total,    gradient:'from-blue-500 to-blue-400',    icon:Users,       shadow:'shadow-blue-500/30' },
          { label:'Aktif Tanding', value:summary.aktif,    gradient:'from-green-500 to-green-400',  icon:Activity,    shadow:'shadow-green-500/30' },
          { label:'Cedera',        value:summary.cedera,   gradient:'from-red-500 to-red-400',      icon:AlertTriangle,shadow:'shadow-red-500/30' },
          { label:'Lolos Kual.',   value:summary.lolos,    gradient:'from-cyan-500 to-cyan-400',    icon:CheckCircle, shadow:'shadow-cyan-500/30' },
          { label:'Total Emas',    value:summary.totalEmas,gradient:'from-yellow-500 to-orange-400',icon:Medal,       shadow:'shadow-yellow-500/30' },
          { label:'Verif Pending', value:summary.pending,  gradient:'from-orange-500 to-orange-400',icon:Clock,       shadow:'shadow-orange-500/30' },
        ].map(c => (
          <div key={c.label} className="relative bg-white rounded-xl shadow-md p-3 pt-7">
            <div className={`absolute -top-4 left-3 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-tr ${c.gradient} ${c.shadow}`}>
              <c.icon size={18} className="text-white" />
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 mb-0.5">{c.label}</p>
              <h4 className="text-xl font-light text-[#3c4858]">{c.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Filter Bar ─── */}
      <div {...ani(60)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atlet / cabor..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#E84E0F]/30 outline-none bg-gray-50" />
        </div>
        <select value={filterCabor} onChange={e => setFilterCabor(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 outline-none">
          {cabors.map(c => <option key={c} value={c}>{c === 'semua' ? 'Semua Cabor' : c}</option>)}
        </select>
        <select value={filterGender} onChange={e => setFilterGender(e.target.value as any)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 bg-gray-50 outline-none">
          <option value="semua">L & P</option>
          <option value="L">Putra</option>
          <option value="P">Putri</option>
        </select>
        <div className="flex gap-1.5 flex-wrap">
          {(['semua','aktif','cedera','standby'] as const).map(s => {
            const conf = s === 'semua' ? { label:'Semua', color:'text-gray-600', bg:'bg-gray-100' } : ATLET_STATUS[s]
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filterStatus === s ? `${conf.bg} ${conf.color} border-transparent font-bold` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}>
                {conf.label}
              </button>
            )
          })}
        </div>
        <div className="flex gap-1.5 ml-auto">
          {(['semua','lolos','pending','cadangan'] as const).map(s => {
            const conf = s === 'semua' ? { label:'Semua Kual.', color:'text-gray-600', bg:'bg-gray-100', border:'border-gray-200' } : KUAL_CONF[s]
            return (
              <button key={s} onClick={() => setFilterKual(s)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filterKual === s ? `${conf.bg} ${conf.color} ${conf.border} font-bold` : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}>
                {conf.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Info count ─── */}
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-gray-400">{filtered.length} atlet ditemukan</span>
        {summary.cedera > 0 && (
          <span className="text-xs bg-red-50 border border-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
            ⚠ {summary.cedera} atlet cedera
          </span>
        )}
      </div>

      {/* ─── Atlet Grid ─── */}
      <div {...ani(80)} className="grid grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-20 text-gray-400">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Tidak ada atlet ditemukan</p>
          </div>
        ) : (
          filtered.map((a, i) => (
            <div key={a.id}
              style={{ transitionDelay:`${80 + i * 40}ms`, transition:'all 0.6s ease' }}
              className={animIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}>
              <AtletCard atlet={a} onEdit={() => {}} />
            </div>
          ))
        )}
      </div>

    </div>
  )
}