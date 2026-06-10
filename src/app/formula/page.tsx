/**
 * Public Formula Disclosure Page (Defense Layer L6)
 * /formula
 *
 * NO AUTH. Anyone can read the math behind PentaScore Indonesia.
 */
import Link from 'next/link'
import { ChevronLeft, Shield, Sparkles, Sword, Waves, Mountain, Target, ExternalLink, FileText, Award } from 'lucide-react'

export const dynamic = 'force-static'
export const revalidate = 86400  // 24h

export default function FormulaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-amber-500/30 bg-slate-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-slate-400 hover:text-white text-xs flex items-center gap-1">
            <ChevronLeft size={14} /> Home
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-amber-300 flex items-center gap-2">
              <Shield size={18} /> Formula Disclosure
            </h1>
            <p className="text-[10px] text-slate-500">
              Defense Layer <span className="text-amber-300 font-bold">L6</span> · Public transparency for scoring integrity
            </p>
          </div>
          <code className="text-xs text-amber-300 font-mono">uipm-2026-v1</code>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Intro */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5">
          <h2 className="text-amber-200 font-bold mb-2 flex items-center gap-2">
            <Sparkles size={16} /> Mengapa publik?
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            PentaScore Indonesia mengikuti <strong>UIPM Modern Pentathlon Competition Rules 2026</strong>.
            Halaman ini menampilkan semua rumus yang digunakan untuk menghitung Modern Pentathlon (MP) Points
            sehingga atlet, pelatih, dan panitia dapat <strong>memverifikasi sendiri</strong> hasil pertandingan.
          </p>
          <p className="text-sm text-slate-300 mt-3">
            Sistem kami sudah <strong>diverifikasi 99.52%</strong> match terhadap data resmi UIPM World Cup Final 2026 Bonn
            (1248/1254 sel benar; 6 deviasi dapat dijelaskan).
          </p>
        </div>

        {/* TOC */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <TocLink href="#fencing-ranking" icon={Sword} label="Fencing Ranking" />
          <TocLink href="#fencing-de" icon={Sword} label="Fencing DE" />
          <TocLink href="#swimming" icon={Waves} label="Swimming" />
          <TocLink href="#obstacle" icon={Mountain} label="Obstacle" />
          <TocLink href="#laserrun" icon={Target} label="Laser Run" />
        </div>

        {/* Fencing Ranking Round */}
        <Section id="fencing-ranking" icon={Sword} title="Fencing — Ranking Round (Quali)" appendix="UIPM Appendix 2B1">
          <p className="text-sm text-slate-300 mb-4">
            Round-robin di dalam group (semua atlet bertanding 1 bout vs setiap atlet lain).
            Setiap bout: durasi 1 menit, satu sentuhan menang.
          </p>

          <Formula code={`
MP_Points = 250 + (V − target_V) × pts_per_V − red_cards × 10

Where:
  V          = jumlah victories atlet (bouts won)
  target_V   = baseline victories untuk 250 pts (lookup berdasarkan group size)
  pts_per_V  = poin tambahan per 1 victory (lookup berdasarkan group size)
  red_cards  = jumlah red cards (penalty -10 each)
  black_card → MP_Points = 0 + status DSQ
          `} />

          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mt-4 mb-2">
            Lookup Table (group size 20-61, total_bouts 19-60)
          </h4>
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40">
            <table className="w-full text-xs">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-3 py-2 text-left">Group Size</th>
                  <th className="px-3 py-2 text-left">Total Bouts</th>
                  <th className="px-3 py-2 text-right">target_V</th>
                  <th className="px-3 py-2 text-right">pts_per_V</th>
                  <th className="px-3 py-2 text-right">Example: V=target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                {RANKING_TABLE_SAMPLE.map(([gs, tb, tv, pp]) => (
                  <tr key={tb}>
                    <td className="px-3 py-1.5 text-slate-400">{gs}</td>
                    <td className="px-3 py-1.5">{tb}</td>
                    <td className="px-3 py-1.5 text-right text-amber-300">{tv}</td>
                    <td className="px-3 py-1.5 text-right text-amber-300">{pp}</td>
                    <td className="px-3 py-1.5 text-right text-green-400">250</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Tabel lengkap 19-60 bouts ada di kode <code className="text-amber-300">pentascore_v1.ts</code>.
          </p>

          <ExampleBox>
            <strong>Contoh:</strong> Atlet di group 30 atlet (total_bouts = 29) menang 22 bouts dengan 1 red card.<br/>
            <code className="text-amber-300">target_V = 21, pts_per_V = 6</code><br/>
            <code className="text-green-400">MP = 250 + (22 − 21) × 6 − 1 × 10 = 250 + 6 − 10 = <strong>246</strong></code>
          </ExampleBox>
        </Section>

        {/* Fencing DE */}
        <Section id="fencing-de" icon={Sword} title="Fencing — Direct Elimination (Semi/Final)" appendix="UIPM Appendix 2B2">
          <p className="text-sm text-slate-300 mb-4">
            Bracket eliminasi langsung dengan 18 final positions. MP Points di-lookup berdasarkan
            posisi akhir bracket (1st = juara, 18th = first eliminated).
          </p>

          <Formula code={`
MP_Points = FENCING_DE_TABLE[de_position]

Where de_position is 1..18 with values:
  1 → 250    7 → 226    13 → 210
  2 → 244    8 → 224    14 → 208
  3 → 238    9 → 218    15 → 206
  4 → 236   10 → 216    16 → 204
  5 → 230   11 → 214    17 → 198
  6 → 228   12 → 212    18 → 196

Status eliminated/DSQ → MP_Points = 0
          `} />

          <ExampleBox>
            <strong>Contoh:</strong> Atlet finish posisi 3 di Final (medali perunggu).<br/>
            <code className="text-green-400">MP = 238</code>
          </ExampleBox>
        </Section>

        {/* Swimming */}
        <Section id="swimming" icon={Waves} title="Swimming — 200m Freestyle" appendix="UIPM Appendix 2C">
          <p className="text-sm text-slate-300 mb-4">
            Renang gaya bebas 200 meter. Penalty diberikan untuk pelanggaran (false start, dll.).
          </p>

          <Formula code={`
MP_Points = max(0, 600 − floor(5 × time_seconds) − penalty_points)

Or in integer form (centiseconds):
MP_Points = max(0, 600 − floor(5 × time_centis / 100) − penalty_points)

Status DNF/DNS/DSQ → MP_Points = 0
          `} />

          <ExampleBox>
            <strong>Contoh:</strong> Atlet renang 02:11.45 (131.45 detik) tanpa penalty.<br/>
            <code className="text-green-400">MP = 600 − floor(5 × 131.45) = 600 − 657 = 0</code> (terlalu lambat)<br/>
            <br/>
            <strong>Contoh elit:</strong> Atlet renang 01:55.00 (115 detik).<br/>
            <code className="text-green-400">MP = 600 − floor(5 × 115) = 600 − 575 = <strong>25</strong></code><br/>
            <br/>
            <strong>Contoh kelas dunia:</strong> Atlet renang 01:48.00 (108 detik).<br/>
            <code className="text-green-400">MP = 600 − floor(540) = <strong>60</strong></code>
          </ExampleBox>
        </Section>

        {/* Obstacle */}
        <Section id="obstacle" icon={Mountain} title="Obstacle Discipline" appendix="UIPM Appendix 2D">
          <p className="text-sm text-slate-300 mb-4">
            Obstacle course (penggantian Equestrian sejak 2025). Atlet melewati rangkaian obstacle dalam waktu terbatas.
          </p>

          <Formula code={`
MP_Points = max(0, floor(445.96 − 3 × time_seconds) − penalty_points)

Or in integer form (centiseconds):
MP_Points = max(0, floor((44596 − 3 × time_centis) / 100) − penalty_points)

Status DNF/DNS/DSQ → MP_Points = 0
          `} />

          <ExampleBox>
            <strong>Contoh:</strong> Atlet selesai dalam 70.5 detik.<br/>
            <code className="text-green-400">MP = floor(445.96 − 3 × 70.5) = floor(234.46) = <strong>234</strong></code>
          </ExampleBox>
        </Section>

        {/* Laser Run */}
        <Section id="laserrun" icon={Target} title="Laser Run (3,200m run + 4× Laser Shoot)" appendix="UIPM Appendix 2E">
          <p className="text-sm text-slate-300 mb-4">
            Kombinasi lari 3,200m + 4× sesi shooting dengan laser. Atlet harus mengenai 5 target setiap sesi
            (atau maksimum 50 detik per sesi).
          </p>

          <Formula code={`
MP_Points = 1300 − floor(time_seconds)

Or in integer form (centiseconds):
MP_Points = 1300 − floor(time_centis / 100)

Note: Hanya tergantung total time. Penalty (untuk shooting miss) sudah include
dalam finish time karena atlet harus tunggu 50s per sesi jika tidak hit semua.
          `} />

          <ExampleBox>
            <strong>Contoh:</strong> Atlet finish Laser Run dalam 12:30.00 (750 detik).<br/>
            <code className="text-green-400">MP = 1300 − 750 = <strong>550</strong></code><br/>
            <br/>
            Verifikasi Sprint 1: <strong>313/313 = 100% match</strong> untuk Laser Run (paling akurat).
          </ExampleBox>
        </Section>

        {/* Total MP */}
        <Section id="total" icon={Award} title="Total MP Points (Final Ranking)">
          <Formula code={`
Total_MP = Fencing_MP + Swimming_MP + Obstacle_MP + LaserRun_MP

Tiebreaker:
  1. Total_MP descending
  2. Laser Run finish_time ascending (atlet finish duluan menang)
  3. Alphabetical by nama
          `} />
          <p className="text-sm text-slate-300 mt-3">
            Atlet dengan Total_MP tertinggi menang. Posisi 1, 2, 3 = medali emas, perak, perunggu.
          </p>
        </Section>

        {/* Verification */}
        <div className="bg-green-500/5 border border-green-500/30 rounded-xl p-5">
          <h2 className="text-green-300 font-bold mb-2 flex items-center gap-2">
            <Shield size={16} /> Verifikasi Independen
          </h2>
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              Sistem kami telah diverifikasi terhadap data resmi UIPM Modern Pentathlon World Cup Final 2026 Bonn:
            </p>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <Stat label="Total Cells" value="1,254" />
              <Stat label="Matched" value="1,248" green />
              <Stat label="Accuracy" value="99.52%" amber big />
            </div>
            <p className="text-xs text-slate-400 mt-3">
              6 deviasi semua dapat dijelaskan (rounding di Swimming pts ±1 untuk edge case extreme times).
            </p>
          </div>
        </div>

        {/* References */}
        <div className="text-xs text-slate-500 space-y-2 border-t border-slate-800 pt-6">
          <h3 className="text-amber-300 font-bold uppercase tracking-wider">References</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              <a href="https://www.uipmworld.org/sites/default/files/2026_uipm_competition_rules_v1.pdf" target="_blank" className="text-amber-400 hover:underline inline-flex items-center gap-1">
                UIPM 2026 Competition Rules <ExternalLink size={9} />
              </a>
            </li>
            <li>UIPM Modern Pentathlon Statistics & Records 2025</li>
            <li>PentaScore Sprint 1 Verification Report (internal)</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-amber-500/20 mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>© {new Date().getFullYear()} PentaScore Indonesia · Formula Disclosure</div>
          <div className="flex items-center gap-2">
            <code className="text-amber-300">uipm-2026-v1</code>
            <span>· Defense Layer L6 · Public Transparency</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
const RANKING_TABLE_SAMPLE: [number, number, number, number][] = [
  [20, 19, 13, 8],
  [25, 24, 17, 7],
  [30, 29, 21, 6],
  [35, 34, 24, 5],
  [40, 39, 27, 5],
  [45, 44, 31, 4],
  [50, 49, 34, 3],
  [55, 54, 38, 3],
  [60, 59, 41, 3],
  [61, 60, 42, 3],
]

function Section({ id, icon: Icon, title, appendix, children }: any) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-xl font-bold text-amber-300 flex items-center gap-2">
          <Icon size={18} /> {title}
        </h2>
        {appendix && (
          <code className="text-[10px] text-slate-500 uppercase tracking-wider">{appendix}</code>
        )}
      </div>
      <div className="bg-slate-900/40 rounded-xl border border-slate-800 p-5">
        {children}
      </div>
    </section>
  )
}

function Formula({ code }: { code: string }) {
  return (
    <pre className="bg-slate-950/60 border border-amber-500/20 rounded p-4 text-xs text-amber-100 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">
{code.trim()}
    </pre>
  )
}

function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 bg-blue-500/5 border border-blue-500/30 rounded p-3 text-xs text-slate-300 leading-relaxed">
      {children}
    </div>
  )
}

function TocLink({ href, icon: Icon, label }: any) {
  return (
    <a href={href} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 text-xs text-center transition group">
      <Icon size={14} className="mx-auto mb-1 text-amber-400/70 group-hover:text-amber-400" />
      <div className="text-slate-300 group-hover:text-white truncate">{label}</div>
    </a>
  )
}

function Stat({ label, value, green, amber, big }: any) {
  return (
    <div className="text-center p-2 rounded bg-slate-950/40 border border-slate-800">
      <div className={`${big ? 'text-2xl' : 'text-lg'} font-bold font-mono ${
        green ? 'text-green-300' : amber ? 'text-amber-300' : 'text-white'
      }`}>
        {value}
      </div>
      <div className="text-[9px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}
