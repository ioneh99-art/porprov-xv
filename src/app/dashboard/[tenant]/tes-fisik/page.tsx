// app/dashboard/[tenant]/tes-fisik/page.tsx
// Dashboard KONIDA — Tes Fisik aggregate per kontingen
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const KATEGORI_COLOR: Record<string, string> = {
  "Baik Sekali": "#00ff88",
  "Baik":        "#22d3ee",
  "Cukup":       "#facc15",
  "Kurang":      "#fb923c",
  "Kurang Sekali": "#ef4444",
};

const BMI_COLOR: Record<string, string> = {
  underweight: "#facc15", normal: "#00ff88",
  overweight: "#fb923c", obese: "#ef4444", unknown: "#475569",
};

export default function TesFisikDashboardPage() {
  const params = useParams();
  const tenant = params.tenant as string;
  const [data, setData] = useState<any>(null);
  const [kontingenId, setKontingenId] = useState<number | null>(null);

  // Resolve tenant → kontingen_id
  useEffect(() => {
    fetch(`/api/tenant/${tenant}`)
      .then((r) => r.json())
      .then((t) => setKontingenId(t.kontingen_id));
  }, [tenant]);

  useEffect(() => {
    if (!kontingenId) return;
    fetch(`/api/konida/tes-fisik?kontingen_id=${kontingenId}`)
      .then((r) => r.json())
      .then(setData);
  }, [kontingenId]);

  if (!data) return <div className="p-8 text-cyan-300">Memuat...</div>;

  const kategoriData = Object.entries(data.kategori_distribution).map(([k, v]) => ({
    name: k, value: v, color: KATEGORI_COLOR[k] || "#22d3ee",
  }));
  const bmiData = Object.entries(data.bmi_distribution).map(([k, v]) => ({
    name: k, value: v, color: BMI_COLOR[k],
  }));

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-cyan-300">Analisis Tes Fisik Atlet</h1>
        <p className="text-sm text-slate-400">
          Data biomotorik dari FPOK UPI · Tahap 3 (April 2026)
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4 mb-6">
        <KpiCard label="Total Atlet" value={data.summary.total_atlet} color="#22d3ee" />
        <KpiCard label="Sudah Tes" value={data.summary.hadir}
          sub={`${data.summary.participation_rate}% participation`} color="#00ff88" />
        <KpiCard label="Belum Tes (DNS)" value={data.summary.dns} color="#fb923c" />
        <KpiCard label="Rata Fitness" value={`${data.summary.avg_fitness_persen}%`} color="#facc15" />
        <KpiCard label="L / P" value={`${data.summary.gender.L} / ${data.summary.gender.P}`} color="#22d3ee" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Kategori Distribution */}
        <Panel title="Distribusi Kategori Fitness">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={kategoriData} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label>
                {kategoriData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        {/* BMI Distribution */}
        <Panel title="Distribusi BMI">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bmiData}>
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
              <Bar dataKey="value">
                {bmiData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        {/* Top 5 cabor terkuat */}
        <Panel title="🏆 Top 5 Cabor Fisik Terkuat">
          <div className="space-y-2">
            {data.top_cabor.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                <div>
                  <div className="font-semibold">{c.cabor_nama}</div>
                  <div className="text-xs text-slate-400">{c.jumlah_atlet_tes} atlet</div>
                </div>
                <div className="text-xl font-bold text-emerald-400">{c.rata_kesimpulan}%</div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Bottom 5 cabor */}
        <Panel title="⚠️ 5 Cabor Perlu Perhatian">
          <div className="space-y-2">
            {data.bottom_cabor.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                <div>
                  <div className="font-semibold">{c.cabor_nama}</div>
                  <div className="text-xs text-slate-400">
                    {c.jumlah_atlet_tes} atlet · {c.jumlah_atlet_dns} DNS
                  </div>
                </div>
                <div className="text-xl font-bold text-orange-400">{c.rata_kesimpulan}%</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Komponen radar kontingen-wide */}
      <Panel title="Profil Komponen Fisik (Rata-rata Kontingen)">
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data.komponen_overall}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="komponen" tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "#475569" }} />
            <Radar name="Rata Capaian" dataKey="rata_capaian"
              stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.4} />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
          </RadarChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-slate-400">
          💡 Komponen dengan capaian terendah jadi prioritas program latihan kontingen
        </div>
      </Panel>

      {/* Full table per cabor */}
      <Panel title="Detail per Cabor" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="p-2 text-left">Cabor</th>
                <th className="p-2 text-right">Hadir</th>
                <th className="p-2 text-right">DNS</th>
                <th className="p-2 text-right">Rata Fitness</th>
                <th className="p-2 text-right">Rata BMI</th>
                <th className="p-2 text-center">Distribusi</th>
              </tr>
            </thead>
            <tbody>
              {data.per_cabor.map((c: any, i: number) => (
                <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="p-2 font-semibold">{c.cabor_nama}</td>
                  <td className="p-2 text-right">{c.jumlah_atlet_tes}</td>
                  <td className="p-2 text-right text-orange-300">{c.jumlah_atlet_dns}</td>
                  <td className="p-2 text-right font-bold">{c.rata_kesimpulan}%</td>
                  <td className="p-2 text-right">{c.rata_bmi}</td>
                  <td className="p-2">
                    <div className="flex h-2 w-full overflow-hidden rounded">
                      {c.n_baik_sekali > 0 && <div style={{flex: c.n_baik_sekali, background: "#00ff88"}} />}
                      {c.n_baik > 0 && <div style={{flex: c.n_baik, background: "#22d3ee"}} />}
                      {c.n_cukup > 0 && <div style={{flex: c.n_cukup, background: "#facc15"}} />}
                      {c.n_kurang > 0 && <div style={{flex: c.n_kurang, background: "#fb923c"}} />}
                      {c.n_kurang_sekali > 0 && <div style={{flex: c.n_kurang_sekali, background: "#ef4444"}} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function KpiCard({ label, value, sub, color }: any) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

function Panel({ title, children, className = "" }: any) {
  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${className}`}>
      <h3 className="mb-3 text-cyan-300 font-semibold">{title}</h3>
      {children}
    </div>
  );
}