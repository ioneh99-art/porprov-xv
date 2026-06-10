/**
 * Certificate HTML Template
 *
 * Generates self-contained HTML certificate per athlete.
 * User opens in browser → File → Print → Save as PDF.
 * Print stylesheet handles A4 landscape layout.
 */
import type { UipmEventMeta, UipmAthleteResult } from './uipm-xml'

export type CertificateData = {
  meta: UipmEventMeta
  athlete: UipmAthleteResult
  phase_label: string
  tenant_logo_url?: string | null
  tenant_color_primary?: string
}

export function buildCertificateHtml(d: CertificateData): string {
  const primary = d.tenant_color_primary ?? '#F59E0B'
  const a = d.athlete
  const medal = a.position === 1 ? 'GOLD' : a.position === 2 ? 'SILVER' : a.position === 3 ? 'BRONZE' : null
  const medalColor = medal === 'GOLD' ? '#FBBF24' : medal === 'SILVER' ? '#94A3B8' : medal === 'BRONZE' ? '#FB923C' : primary

  const escape = (s: any) => String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Certificate — ${escape(a.nama_lengkap)} — ${escape(d.meta.event_name)}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: 'Georgia', 'Times New Roman', serif;
      background: #f1f5f9;
    }
    .cert-page {
      width: 297mm; height: 210mm;
      padding: 25mm 30mm;
      background: white;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .cert-page::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 8mm;
      background: linear-gradient(90deg, ${primary} 0%, ${medalColor} 50%, ${primary} 100%);
    }
    .cert-page::after {
      content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 8mm;
      background: linear-gradient(90deg, ${primary} 0%, ${medalColor} 50%, ${primary} 100%);
    }
    .header { display: flex; align-items: center; gap: 20px; margin-bottom: 30px; }
    .logo { width: 80px; height: 80px; border-radius: 8px; object-fit: contain; border: 3px solid ${primary}; }
    .logo-placeholder {
      width: 80px; height: 80px; border-radius: 8px;
      background: ${primary}; color: white; font-weight: bold; font-size: 28px;
      display: flex; align-items: center; justify-content: center;
    }
    .header-text h1 { margin: 0; font-size: 22px; color: ${primary}; letter-spacing: 1px; text-transform: uppercase; }
    .header-text p { margin: 4px 0 0; color: #64748B; font-size: 14px; }
    .title-section { text-align: center; margin: 30px 0 20px; }
    .title-section .label { font-size: 14px; letter-spacing: 4px; color: #94A3B8; text-transform: uppercase; }
    .title-section .name { font-size: 56px; font-family: 'Georgia', serif; color: #0F172A; margin: 10px 0; font-weight: bold; }
    .title-section .detail { font-size: 16px; color: #475569; }
    .medal-banner {
      text-align: center; margin: 30px 0;
      padding: 20px;
      background: linear-gradient(135deg, ${medalColor}15 0%, ${medalColor}05 100%);
      border: 2px solid ${medalColor};
      border-radius: 12px;
    }
    .medal-banner .position {
      font-size: 96px; font-weight: bold;
      color: ${medalColor};
      line-height: 1;
      text-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .medal-banner .label { font-size: 18px; color: ${medalColor}; letter-spacing: 6px; text-transform: uppercase; margin-top: 8px; font-weight: bold; }
    .medal-banner .mp-total {
      margin-top: 12px; font-size: 14px; color: #475569;
    }
    .medal-banner .mp-total strong { color: ${primary}; font-size: 22px; font-family: monospace; }
    .breakdown {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
      margin: 24px 0;
    }
    .breakdown .stat {
      text-align: center; padding: 12px;
      background: #F8FAFC; border-radius: 6px;
      border: 1px solid #E2E8F0;
    }
    .breakdown .stat .label { font-size: 10px; letter-spacing: 1px; color: #94A3B8; text-transform: uppercase; }
    .breakdown .stat .value { font-size: 24px; font-weight: bold; color: #1E293B; font-family: monospace; margin: 4px 0 0; }
    .footer {
      position: absolute; bottom: 20mm; left: 30mm; right: 30mm;
      display: flex; justify-content: space-between; align-items: flex-end;
      font-size: 10px; color: #94A3B8;
    }
    .footer .verify { text-align: right; }
    .footer code { background: #F8FAFC; padding: 2px 6px; border-radius: 3px; color: ${primary}; }
    .signature-line {
      width: 200px; border-top: 1px solid #94A3B8;
      padding-top: 4px;
      text-align: center; font-size: 12px; color: #64748B;
    }
    @media print {
      body { background: white; }
      .cert-page { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="cert-page">
    <div class="header">
      ${d.tenant_logo_url
        ? `<img src="${escape(d.tenant_logo_url)}" alt="" class="logo" onerror="this.outerHTML='<div class=\\'logo-placeholder\\'>${escape(d.meta.tenant_name.slice(0,2).toUpperCase())}</div>'">`
        : `<div class="logo-placeholder">${escape(d.meta.tenant_name.slice(0,2).toUpperCase())}</div>`}
      <div class="header-text">
        <h1>${escape(d.meta.tenant_name)}</h1>
        <p>${escape(d.meta.event_name)} · ${escape(d.meta.lokasi ?? '')}</p>
        <p style="font-size: 12px; color: #94A3B8;">${escape(d.meta.tanggal_mulai)} → ${escape(d.meta.tanggal_selesai)}</p>
      </div>
    </div>

    <div class="title-section">
      <div class="label">Certificate of Achievement</div>
      <div class="detail">This certifies that</div>
      <div class="name">${escape(a.nama_lengkap)}</div>
      <div class="detail">
        ${a.negara_code ? `representing <strong>${escape(a.negara_code)}</strong> · ` : ''}
        ${a.affiliation_nama ? escape(a.affiliation_nama) : ''}
        ${a.start_number ? ` · Start No. <strong>#${a.start_number}</strong>` : ''}
      </div>
      <div class="detail" style="margin-top:10px;">competed in <strong>${escape(d.phase_label)}</strong> and finished at</div>
    </div>

    <div class="medal-banner">
      <div class="position">${a.position}${ordinalSuffix(a.position)}</div>
      <div class="label">${medal ?? 'Position'}</div>
      <div class="mp-total">Total Modern Pentathlon Points: <strong>${a.total_mp_points}</strong></div>
    </div>

    <div class="breakdown">
      <div class="stat">
        <div class="label">Fencing</div>
        <div class="value">${a.fencing_pts}</div>
      </div>
      <div class="stat">
        <div class="label">Swimming</div>
        <div class="value">${a.swimming_pts}</div>
      </div>
      <div class="stat">
        <div class="label">Obstacle</div>
        <div class="value">${a.obstacle_pts}</div>
      </div>
      <div class="stat">
        <div class="label">Laser Run</div>
        <div class="value">${a.laserrun_pts}</div>
      </div>
    </div>

    <div class="footer">
      <div>
        <div class="signature-line">Race Director</div>
      </div>
      <div class="verify">
        <div>Scored with <strong>PentaScore Indonesia</strong></div>
        <div>Formula: <code>${escape(d.meta.formula_version)}</code> · 99.52% verified vs UIPM</div>
        <div>Generated ${new Date().toLocaleString('id-ID')}</div>
      </div>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog if ?print=1
    if (window.location.search.includes('print=1')) {
      window.addEventListener('load', () => setTimeout(() => window.print(), 500))
    }
  </script>
</body>
</html>`
}

function ordinalSuffix(n: number): string {
  const j = n % 10, k = n % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

/**
 * Build aggregate certificate document for multiple athletes (one per page).
 */
export function buildBulkCertificatesHtml(
  meta: UipmEventMeta,
  athletes: UipmAthleteResult[],
  phaseLabel: string,
  tenantLogoUrl?: string | null,
  tenantColorPrimary?: string,
): string {
  const pages = athletes.map(a => buildCertificateHtml({
    meta, athlete: a, phase_label: phaseLabel,
    tenant_logo_url: tenantLogoUrl, tenant_color_primary: tenantColorPrimary,
  }))
  // Extract only the <body> contents of each page and combine into one document
  const bodyContents = pages.map(p => {
    const m = p.match(/<body[^>]*>([\s\S]*?)<\/body>/)
    return m ? m[1] : ''
  }).join('\n')

  // Reuse the first page's <head>
  const head = pages[0]?.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1] ?? ''
  return `<!DOCTYPE html>
<html lang="id">
<head>${head}</head>
<body>${bodyContents}</body>
</html>`
}
