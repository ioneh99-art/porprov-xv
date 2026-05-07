export default function PresentasiPage() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PORPROV XV — Sistem Informasi Atlet</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/theme/black.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/highlight/monokai.css" />
        <style>{`
          :root {
            --r-background-color: #0f172a;
            --r-main-color: #f1f5f9;
            --r-heading-color: #ffffff;
            --r-link-color: #3b82f6;
            --r-selection-background-color: #3b82f6;
          }
          .reveal .slides { text-align: left; }
          .reveal h1 { font-size: 2.2em; font-weight: 700; line-height: 1.2; }
          .reveal h2 { font-size: 1.5em; font-weight: 600; color: #94a3b8; margin-bottom: 0.5em; }
          .reveal h3 { font-size: 1.1em; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 0.8em; }
          .reveal p { font-size: 0.85em; color: #94a3b8; line-height: 1.6; }
          .reveal section { padding: 0 40px; }

          /* Badge */
          .badge { display: inline-block; font-size: 0.5em; padding: 4px 14px; border-radius: 20px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 16px; vertical-align: middle; }
          .badge-blue { background: rgba(59,130,246,0.15); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3); }
          .badge-green { background: rgba(34,197,94,0.15); color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
          .badge-amber { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
          .badge-red { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

          /* KPI Cards */
          .kpi-row { display: flex; gap: 16px; margin-top: 24px; }
          .kpi { flex: 1; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; }
          .kpi-val { font-size: 2.2em; font-weight: 700; color: #fff; display: block; }
          .kpi-lbl { font-size: 0.55em; color: #64748b; margin-top: 4px; display: block; }

          /* Feature grid */
          .feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
          .feat { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px 18px; }
          .feat-title { font-size: 0.65em; font-weight: 600; color: #e2e8f0; margin-bottom: 6px; }
          .feat-desc { font-size: 0.55em; color: #64748b; line-height: 1.5; margin: 0; }

          /* Role cards */
          .role-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-top: 20px; }
          .role-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px 16px; text-align: center; }
          .role-title { font-size: 0.65em; font-weight: 600; color: #e2e8f0; margin: 10px 0 6px; }
          .role-desc { font-size: 0.5em; color: #64748b; line-height: 1.5; margin: 0; }
          .role-icon { font-size: 1.8em; }

          /* Flow steps */
          .flow-row { display: flex; align-items: center; gap: 8px; margin-top: 24px; }
          .flow-step { flex: 1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px 12px; text-align: center; }
          .flow-step-num { font-size: 0.45em; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
          .flow-step-name { font-size: 0.6em; font-weight: 600; color: #e2e8f0; }
          .flow-step-role { font-size: 0.45em; color: #64748b; margin-top: 4px; }
          .flow-arrow { color: #334155; font-size: 1.2em; flex-shrink: 0; }
          .flow-step.final { border-color: rgba(34,197,94,0.4); background: rgba(34,197,94,0.05); }
          .flow-step.final .flow-step-name { color: #4ade80; }

          /* Status pills */
          .pill-row { display: flex; gap: 8px; margin-top: 16px; align-items: center; flex-wrap: wrap; }
          .pill { font-size: 0.45em; padding: 5px 12px; border-radius: 20px; background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }
          .pill.verified { background: rgba(34,197,94,0.1); color: #4ade80; border-color: rgba(34,197,94,0.3); }
          .pill.posted { background: rgba(59,130,246,0.1); color: #60a5fa; border-color: rgba(59,130,246,0.3); }
          .pill-arrow { color: #334155; font-size: 0.8em; }

          /* Stack grid */
          .stack-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
          .stack-item { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
          .stack-icon { font-size: 1.4em; flex-shrink: 0; }
          .stack-name { font-size: 0.6em; font-weight: 600; color: #e2e8f0; }
          .stack-desc { font-size: 0.48em; color: #64748b; margin-top: 2px; }

          /* Roadmap */
          .road-list { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
          .road-item { display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; }
          .road-phase { font-size: 0.45em; font-weight: 600; padding: 4px 12px; border-radius: 20px; flex-shrink: 0; }
          .road-title { font-size: 0.6em; font-weight: 600; color: #e2e8f0; }
          .road-desc { font-size: 0.48em; color: #64748b; margin-top: 2px; }

          /* CTA */
          .cta-box { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 14px; padding: 28px 32px; margin-top: 20px; text-align: center; }
          .cta-url { font-family: monospace; font-size: 0.75em; color: #60a5fa; margin-top: 8px; }

          /* Problem list */
          .prob-list { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
          .prob-item { display: flex; align-items: flex-start; gap: 14px; background: rgba(239,68,68,0.04); border: 1px solid rgba(239,68,68,0.12); border-radius: 10px; padding: 14px 16px; }
          .prob-icon { font-size: 1.2em; flex-shrink: 0; margin-top: 2px; }
          .prob-title { font-size: 0.6em; font-weight: 600; color: #fca5a5; }
          .prob-desc { font-size: 0.5em; color: #64748b; margin-top: 3px; line-height: 1.4; }

          /* Divider line */
          .divider { height: 1px; background: rgba(255,255,255,0.06); margin: 16px 0; }

          /* Number big */
          .big-num { font-size: 3.5em; font-weight: 700; color: #3b82f6; display: block; line-height: 1; }
          .big-label { font-size: 0.6em; color: #64748b; }

          /* Highlight text */
          .hl-blue { color: #60a5fa; }
          .hl-green { color: #4ade80; }
          .hl-amber { color: #fbbf24; }

          /* Cover accent line */
          .accent-line { width: 60px; height: 4px; background: #3b82f6; border-radius: 2px; margin: 16px 0 24px; }

          /* Footer slide */
          .slide-footer { position: absolute; bottom: 20px; left: 40px; right: 40px; font-size: 0.4em; color: #334155; display: flex; justify-content: space-between; }

          /* Infographic bar */
          .bar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
          .bar-label { font-size: 0.55em; color: #94a3b8; width: 140px; flex-shrink: 0; text-align: right; }
          .bar-track { flex: 1; background: rgba(255,255,255,0.06); border-radius: 4px; height: 10px; overflow: hidden; }
          .bar-fill { height: 100%; border-radius: 4px; transition: width 0.8s ease; }
          .bar-val { font-size: 0.55em; color: #e2e8f0; font-weight: 600; width: 50px; }
        `}</style>
      </head>
      <body style={{margin:0,padding:0,background:'#0f172a'}}>
        <div className="reveal">
          <div className="slides">

            {/* SLIDE 1 — COVER */}
            <section>
              <h3><span className="badge badge-blue">Paparan Teknis 2026</span></h3>
              <h1>Sistem Informasi<br/>Manajemen Atlet</h1>
              <div className="accent-line" />
              <p>Platform terintegrasi untuk registrasi, verifikasi, dan klasemen atlet<br/><span className="hl-blue">PORPROV XV Jawa Barat 2026</span> secara real-time</p>
              <div className="kpi-row">
                <div className="kpi"><span className="kpi-val">27</span><span className="kpi-lbl">Kontingen</span></div>
                <div className="kpi"><span className="kpi-val">65+</span><span className="kpi-lbl">Cabang Olahraga</span></div>
                <div className="kpi"><span className="kpi-val">24K+</span><span className="kpi-lbl">Atlet Terdaftar</span></div>
                <div className="kpi"><span className="kpi-val">3</span><span className="kpi-lbl">Tahap Verifikasi</span></div>
              </div>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>porprov-xv.vercel.app</span></div>
            </section>

            {/* SLIDE 2 — PROBLEM */}
            <section>
              <h3><span className="badge badge-red">Latar Belakang</span></h3>
              <h1>Permasalahan<br/>sistem lama</h1>
              <div className="prob-list">
                <div className="prob-item">
                  <div className="prob-icon">📁</div>
                  <div><div className="prob-title">Data tidak terpusat</div><div className="prob-desc">Data atlet tersebar di file Excel tiap kontingen — sulit dikonsolidasi dan rawan duplikasi</div></div>
                </div>
                <div className="prob-item">
                  <div className="prob-icon">⏳</div>
                  <div><div className="prob-title">Verifikasi lambat dan manual</div><div className="prob-desc">Proses approval dokumen memakan waktu lama dan sangat rawan human error</div></div>
                </div>
                <div className="prob-item">
                  <div className="prob-icon">📊</div>
                  <div><div className="prob-title">Tidak ada visibilitas real-time</div><div className="prob-desc">Klasemen medali tidak bisa dipantau langsung — harus menunggu laporan manual</div></div>
                </div>
                <div className="prob-item">
                  <div className="prob-icon">📄</div>
                  <div><div className="prob-title">Dokumen tidak terkelola</div><div className="prob-desc">KTP, KK, Akta, Ijazah atlet sulit dilacak dan sering tidak lengkap saat dibutuhkan</div></div>
                </div>
              </div>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>2 / 8</span></div>
            </section>

            {/* SLIDE 3 — SOLUTION */}
            <section>
              <h3><span className="badge badge-green">Solusi</span></h3>
              <h1>Fitur unggulan<br/>sistem</h1>
              <div className="feat-grid">
                <div className="feat">
                  <div className="feat-title">🔐 Multi-role access</div>
                  <div className="feat-desc">Admin, KONIDA, Operator Cabor — dashboard dan hak akses terpisah per role</div>
                </div>
                <div className="feat">
                  <div className="feat-title">✅ Verifikasi 3 tahap</div>
                  <div className="feat-desc">KONIDA → Operator Cabor → Admin — alur approval yang terstruktur dan transparan</div>
                </div>
                <div className="feat">
                  <div className="feat-title">📎 Upload dokumen digital</div>
                  <div className="feat-desc">KTP, KK, Akta, Ijazah, BPJS tersimpan di cloud — mudah diakses kapanpun</div>
                </div>
                <div className="feat">
                  <div className="feat-title">🏆 Klasemen live publik</div>
                  <div className="feat-desc">Perolehan medali real-time — tanpa login, bisa dibuka siapapun dari HP</div>
                </div>
                <div className="feat">
                  <div className="feat-title">📱 Responsive & mobile-friendly</div>
                  <div className="feat-desc">Bisa diakses dari HP, tablet, atau laptop — tidak perlu install aplikasi</div>
                </div>
                <div className="feat">
                  <div className="feat-title">🔄 Auto-update klasemen</div>
                  <div className="feat-desc">PostgreSQL trigger — klasemen berubah otomatis saat medali diinput operator</div>
                </div>
              </div>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>3 / 8</span></div>
            </section>

            {/* SLIDE 4 — ROLES */}
            <section>
              <h3><span className="badge badge-blue">Struktur Akses</span></h3>
              <h1>Tiga level<br/>pengguna sistem</h1>
              <div className="role-grid">
                <div className="role-card">
                  <div className="role-icon">🛡️</div>
                  <div className="role-title" style={{color:'#60a5fa'}}>Admin PORPROV</div>
                  <div className="role-desc">Akses penuh — verifikasi final, posting atlet, pantau semua kontingen dan cabang olahraga</div>
                </div>
                <div className="role-card">
                  <div className="role-icon">🏘️</div>
                  <div className="role-title" style={{color:'#fbbf24'}}>KONIDA</div>
                  <div className="role-desc">Input dan kelola atlet kontingen sendiri — upload dokumen dan submit ke operator cabor</div>
                </div>
                <div className="role-card">
                  <div className="role-icon">🏃</div>
                  <div className="role-title" style={{color:'#4ade80'}}>Operator Cabor</div>
                  <div className="role-desc">Review atlet per cabor — input hasil pertandingan dan tetapkan medali emas/perak/perunggu</div>
                </div>
              </div>
              <div className="divider" />
              <p style={{textAlign:'center',fontSize:'0.6em'}}>
                Ditambah akses <span className="hl-blue">publik</span> — klasemen live tanpa login untuk wartawan, penonton, dan official kontingen
              </p>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>4 / 8</span></div>
            </section>

            {/* SLIDE 5 — FLOW */}
            <section>
              <h3><span className="badge badge-blue">Alur Proses</span></h3>
              <h1>Registrasi atlet<br/>3 tahap approval</h1>
              <div className="flow-row">
                <div className="flow-step">
                  <div className="flow-step-num">Tahap 1</div>
                  <div className="flow-step-name">Input & Submit</div>
                  <div className="flow-step-role">oleh KONIDA</div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-step-num">Tahap 2</div>
                  <div className="flow-step-name">Review Cabor</div>
                  <div className="flow-step-role">oleh Operator</div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step">
                  <div className="flow-step-num">Tahap 3</div>
                  <div className="flow-step-name">Verifikasi Final</div>
                  <div className="flow-step-role">oleh Admin</div>
                </div>
                <div className="flow-arrow">→</div>
                <div className="flow-step final">
                  <div className="flow-step-num">Selesai</div>
                  <div className="flow-step-name">Posted</div>
                  <div className="flow-step-role" style={{color:'#4ade80'}}>Data final</div>
                </div>
              </div>
              <div className="pill-row">
                <span className="pill">Draft</span>
                <span className="pill-arrow">→</span>
                <span className="pill">Menunggu Cabor</span>
                <span className="pill-arrow">→</span>
                <span className="pill">Menunggu Admin</span>
                <span className="pill-arrow">→</span>
                <span className="pill verified">Verified</span>
                <span className="pill-arrow">→</span>
                <span className="pill posted">Posted</span>
              </div>
              <div className="divider" />
              <p style={{fontSize:'0.55em'}}>Reject di tahap manapun → atlet kembali ke <span className="hl-amber">Draft</span> dan KONIDA bisa revisi data sebelum submit ulang</p>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>5 / 8</span></div>
            </section>

            {/* SLIDE 6 — TECH STACK */}
            <section>
              <h3><span className="badge badge-blue">Teknologi</span></h3>
              <h1>Tech stack<br/>yang digunakan</h1>
              <div className="stack-grid">
                <div className="stack-item">
                  <div className="stack-icon">⚡</div>
                  <div><div className="stack-name">Next.js 14</div><div className="stack-desc">Framework React — frontend + backend dalam satu project, SSR + API Routes</div></div>
                </div>
                <div className="stack-item">
                  <div className="stack-icon">🗄️</div>
                  <div><div className="stack-name">Supabase (PostgreSQL)</div><div className="stack-desc">Database cloud — auth, storage dokumen, realtime trigger</div></div>
                </div>
                <div className="stack-item">
                  <div className="stack-icon">🚀</div>
                  <div><div className="stack-name">Vercel</div><div className="stack-desc">Hosting & auto-deploy — CDN global, uptime 99.99%</div></div>
                </div>
                <div className="stack-item">
                  <div className="stack-icon">🔷</div>
                  <div><div className="stack-name">TypeScript</div><div className="stack-desc">Type-safe — minim bug, lebih mudah dikembangkan tim</div></div>
                </div>
                <div className="stack-item">
                  <div className="stack-icon">🎨</div>
                  <div><div className="stack-name">Tailwind CSS</div><div className="stack-desc">UI modern dan konsisten — responsive di semua device</div></div>
                </div>
                <div className="stack-item">
                  <div className="stack-icon">🔐</div>
                  <div><div className="stack-name">Cookie Auth + Middleware</div><div className="stack-desc">Session httpOnly — aman dari XSS, role-based access control</div></div>
                </div>
              </div>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>6 / 8</span></div>
            </section>

            {/* SLIDE 7 — ROADMAP */}
            <section>
              <h3><span className="badge badge-amber">Pengembangan</span></h3>
              <h1>Roadmap<br/>selanjutnya</h1>
              <div className="road-list">
                <div className="road-item">
                  <span className="road-phase" style={{background:'rgba(239,68,68,0.15)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)'}}>Segera</span>
                  <div><div className="road-title">Keamanan password (bcrypt)</div><div className="road-desc">Enkripsi password database agar lebih aman sebelum go-live</div></div>
                </div>
                <div className="road-item">
                  <span className="road-phase" style={{background:'rgba(245,158,11,0.15)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.3)'}}>Fase 2</span>
                  <div><div className="road-title">Manajemen user oleh Admin</div><div className="road-desc">Tambah/edit/nonaktifkan akun KONIDA & Operator dari dashboard</div></div>
                </div>
                <div className="road-item">
                  <span className="road-phase" style={{background:'rgba(245,158,11,0.15)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.3)'}}>Fase 2</span>
                  <div><div className="road-title">Export PDF & cetak kartu atlet</div><div className="road-desc">Laporan per kontingen + kartu atlet dengan foto & QR code</div></div>
                </div>
                <div className="road-item">
                  <span className="road-phase" style={{background:'rgba(59,130,246,0.15)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.3)'}}>Fase 3</span>
                  <div><div className="road-title">Jadwal & hasil pertandingan lengkap</div><div className="road-desc">Drawing, bracket, input hasil live per nomor pertandingan</div></div>
                </div>
              </div>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>7 / 8</span></div>
            </section>

            {/* SLIDE 8 — CTA */}
            <section>
              <h3><span className="badge badge-green">Demo Live</span></h3>
              <h1>Sistem sudah live<br/>dan bisa dicoba</h1>
              <div className="cta-box">
                <p style={{color:'#60a5fa',fontWeight:600,margin:'0 0 4px',fontSize:'0.7em'}}>URL Sistem</p>
                <div className="cta-url">https://porprov-xv.vercel.app</div>
                <div className="divider" />
                <p style={{color:'#60a5fa',fontWeight:600,margin:'0 0 4px',fontSize:'0.7em'}}>Klasemen Medali Live (tanpa login)</p>
                <div className="cta-url">https://porprov-xv.vercel.app/publik/klasemen</div>
              </div>
              <div className="divider" />
              <div className="kpi-row" style={{marginTop:0}}>
                <div className="kpi"><span className="kpi-val" style={{fontSize:'1.4em',color:'#4ade80'}}>✓</span><span className="kpi-lbl">Login 3 role</span></div>
                <div className="kpi"><span className="kpi-val" style={{fontSize:'1.4em',color:'#4ade80'}}>✓</span><span className="kpi-lbl">Flow registrasi</span></div>
                <div className="kpi"><span className="kpi-val" style={{fontSize:'1.4em',color:'#4ade80'}}>✓</span><span className="kpi-lbl">Klasemen live</span></div>
                <div className="kpi"><span className="kpi-val" style={{fontSize:'1.4em',color:'#4ade80'}}>✓</span><span className="kpi-lbl">Deploy Vercel</span></div>
              </div>
              <div className="slide-footer"><span>PORPROV XV · Jawa Barat 2026</span><span>8 / 8</span></div>
            </section>

          </div>
        </div>

        <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js" />
        <script dangerouslySetInnerHTML={{__html:`
          Reveal.initialize({
            hash: true,
            transition: 'slide',
            transitionSpeed: 'fast',
            backgroundTransition: 'fade',
            controls: true,
            progress: true,
            center: false,
            width: '100%',
            height: '100%',
            margin: 0.04,
            plugins: []
          });
        `}} />
      </body>
    </html>
  )
}