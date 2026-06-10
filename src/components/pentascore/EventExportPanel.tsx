'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FileCode, FileSpreadsheet, FileText, Award, Download, Printer,
  ExternalLink, ChevronDown, Sparkles, Shield, Layers,
} from 'lucide-react'

export default function EventExportPanel({
  eventId, eventName, phases,
}: {
  eventId: string
  eventName: string
  phases: any[]
}) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('')

  const phaseParam = selectedPhaseId ? `?phase_id=${selectedPhaseId}` : ''
  const phaseParamPrint = selectedPhaseId ? `?phase_id=${selectedPhaseId}&print=1` : '?print=1'

  return (
    <div className="space-y-6">
      {/* Phase filter */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center gap-3 flex-wrap">
        <Layers size={14} className="text-amber-400" />
        <span className="text-xs text-slate-400">Scope:</span>
        <select
          value={selectedPhaseId}
          onChange={e => setSelectedPhaseId(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white text-sm focus:outline-none focus:border-amber-500"
        >
          <option value="">All Phases (full event)</option>
          {phases.map(p => (
            <option key={p.id} value={p.id}>
              {p.phase_label} · {p.gender === 'L' ? 'Pria' : 'Wanita'} {p.is_locked ? '🔒' : ''}
            </option>
          ))}
        </select>
        {selectedPhaseId && (
          <button
            onClick={() => setSelectedPhaseId('')}
            className="text-xs text-slate-500 hover:text-white transition"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Export cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* UIPM XML */}
        <ExportCard
          icon={FileCode}
          title="UIPM XML"
          desc="Official UIPM Results Reporting Schema for federation submission"
          badge="OFFICIAL"
          badgeColor="amber"
          actions={
            <a
              href={`/api/pentascore/events/${eventId}/export/xml${phaseParam}`}
              download
              className="flex-1 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded transition flex items-center justify-center gap-1.5"
            >
              <Download size={11} /> Download XML
            </a>
          }
          notes={['Schema: UIPM Results v1', 'Includes all disciplines + verification footer']}
        />

        {/* UIPM Excel */}
        <ExportCard
          icon={FileSpreadsheet}
          title="UIPM Excel"
          desc="Multi-sheet workbook matching UIPM published format (Cover + per-phase + Formula)"
          badge="POPULAR"
          badgeColor="green"
          actions={
            <a
              href={`/api/pentascore/events/${eventId}/export/xlsx${phaseParam}`}
              download
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-400 text-slate-900 text-xs font-bold rounded transition flex items-center justify-center gap-1.5"
            >
              <Download size={11} /> Download Excel
            </a>
          }
          notes={['Cover + Final + per-phase + Formula sheets', 'Ready for KONI / Federation reporting']}
        />

        {/* Result Book PDF */}
        <ExportCard
          icon={FileText}
          title="Result Book (PDF)"
          desc="Full event report bound — Cover + Classification + per-phase + Formula reference"
          badge="PRINTABLE"
          badgeColor="blue"
          actions={
            <>
              <a
                href={`/api/pentascore/events/${eventId}/export/result-book${phaseParam}`}
                target="_blank"
                className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={11} /> Preview
              </a>
              <a
                href={`/api/pentascore/events/${eventId}/export/result-book${phaseParamPrint}`}
                target="_blank"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition flex items-center gap-1.5"
                title="Open & auto-print"
              >
                <Printer size={11} />
              </a>
            </>
          }
          notes={['Browser → File → Save as PDF', 'A4 portrait, multi-page', 'Signature lines included']}
        />

        {/* Certificates */}
        <ExportCard
          icon={Award}
          title="Certificates (PDF)"
          desc="One A4-landscape certificate per athlete with medal positioning + breakdown"
          badge="BULK"
          badgeColor="purple"
          actions={
            <>
              <a
                href={`/api/pentascore/events/${eventId}/export/certificate${phaseParam}`}
                target="_blank"
                className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-400 text-white text-xs font-bold rounded transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={11} /> Preview
              </a>
              <a
                href={`/api/pentascore/events/${eventId}/export/certificate${phaseParamPrint}`}
                target="_blank"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded transition flex items-center gap-1.5"
                title="Open & auto-print"
              >
                <Printer size={11} />
              </a>
            </>
          }
          notes={
            selectedPhaseId
              ? ['Bulk: one certificate per athlete in selected phase', 'A4 landscape']
              : ['Select a phase above untuk certificates', 'Default: first phase if all selected']
          }
        />
      </div>

      {/* Pro tips */}
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
        <h3 className="text-amber-200 text-sm font-bold flex items-center gap-2 mb-2">
          <Sparkles size={12} /> Pro Tips
        </h3>
        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
          <li>UIPM XML untuk submit official results ke federation</li>
          <li>Excel paling user-friendly untuk KONI / sponsor reporting</li>
          <li>Result Book: cetak A4 1-sided, bind ring, distribute ke atlet/pelatih</li>
          <li>Certificates: print A4 landscape on premium paper, hand out di ceremony</li>
          <li>Tombol Printer 🖨 auto-trigger browser print dialog</li>
        </ul>
      </div>

      {/* Defense reminder */}
      <div className="bg-slate-900/30 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield size={11} className="text-amber-400" />
          <span>Setiap export embed formula version & verification stats untuk audit trail integrity.</span>
        </div>
      </div>
    </div>
  )
}

function ExportCard({ icon: Icon, title, desc, badge, badgeColor, actions, notes }: any) {
  const badgeColors: Record<string, string> = {
    amber:  'bg-amber-500/15 text-amber-300 border-amber-500/30',
    green:  'bg-green-500/15 text-green-300 border-green-500/30',
    blue:   'bg-blue-500/15 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  }
  return (
    <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Icon size={18} className="text-amber-300" />
        </div>
        {badge && (
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${badgeColors[badgeColor]}`}>
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-4">{desc}</p>
      <div className="flex items-center gap-2 mt-auto mb-3">
        {actions}
      </div>
      <ul className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-800 pt-3">
        {notes.map((n: string, i: number) => (
          <li key={i}>· {n}</li>
        ))}
      </ul>
    </div>
  )
}
