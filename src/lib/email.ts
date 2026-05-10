import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'PORPROV XV <onboarding@resend.dev>'

interface EmailAtletStatusProps {
  to: string
  namaPenerima: string
  namaAtlet: string
  status: string
  alasan?: string
  role: 'konida' | 'operator'
}

// Template email
const getStatusColor = (status: string) => {
  if (status.includes('Verified') || status.includes('Approved')) return '#10B981'
  if (status.includes('Ditolak')) return '#EF4444'
  if (status.includes('Menunggu')) return '#F59E0B'
  return '#3B82F6'
}

const getStatusEmoji = (status: string) => {
  if (status.includes('Verified') || status.includes('Approved')) return '✅'
  if (status.includes('Ditolak')) return '❌'
  if (status.includes('Menunggu')) return '⏳'
  return '📋'
}

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#020617;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">

    <!-- Header -->
    <div style="background:#1B3A6B;border-radius:16px 16px 0 0;padding:24px 32px;text-align:center;">
      <div style="color:#93C5FD;font-size:11px;font-weight:bold;letter-spacing:3px;margin-bottom:8px;">
        PORPROV XV · JAWA BARAT 2026
      </div>
      <div style="color:white;font-size:18px;font-weight:bold;">
        Sistem Informasi Atlet
      </div>
      <div style="color:#93C5FD;font-size:12px;margin-top:4px;">
        7 – 20 November 2026
      </div>
    </div>

    <!-- Content -->
    <div style="background:#0F172A;border:1px solid #1E293B;border-top:none;border-radius:0 0 16px 16px;padding:32px;">
      ${content}

      <!-- Footer -->
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #1E293B;text-align:center;">
        <div style="color:#475569;font-size:11px;">
          Email ini dikirim otomatis oleh Sistem Informasi Atlet PORPROV XV<br/>
          Jangan balas email ini · <a href="https://porprov-xv.vercel.app" style="color:#3B82F6;">Buka Sistem</a>
        </div>
        <div style="color:#334155;font-size:10px;margin-top:8px;">
          © 2026 KONI Jawa Barat
        </div>
      </div>
    </div>

  </div>
</body>
</html>
`

// Email 1: Notifikasi ke Operator saat KONIDA submit atlet
export async function emailAtletBaru(props: {
  to: string
  namaOperator: string
  namaCabor: string
  jumlahAtlet: number
  namaKontingen: string
}) {
  const { to, namaOperator, namaCabor, jumlahAtlet, namaKontingen } = props

  const content = `
    <div style="color:#94A3B8;font-size:14px;margin-bottom:24px;">
      Halo <strong style="color:white;">${namaOperator}</strong>,
    </div>

    <div style="background:#1E293B;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">⏳</div>
      <div style="color:white;font-size:20px;font-weight:bold;">${jumlahAtlet} Atlet Baru</div>
      <div style="color:#94A3B8;font-size:13px;margin-top:4px;">
        Menunggu verifikasi kamu
      </div>
    </div>

    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#64748B;font-size:12px;">Kontingen</span>
        <span style="color:white;font-size:12px;font-weight:bold;">${namaKontingen}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#64748B;font-size:12px;">Cabang Olahraga</span>
        <span style="color:white;font-size:12px;font-weight:bold;">${namaCabor}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#64748B;font-size:12px;">Jumlah Atlet</span>
        <span style="color:#F59E0B;font-size:12px;font-weight:bold;">${jumlahAtlet} atlet</span>
      </div>
    </div>

    <div style="color:#94A3B8;font-size:13px;margin-bottom:24px;">
      Silakan segera review dan verifikasi data atlet tersebut di sistem.
    </div>

    <a href="https://porprov-xv.vercel.app/operator/verifikasi"
      style="display:block;background:#10B981;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
      Verifikasi Sekarang →
    </a>
  `

  return resend.emails.send({
    from: FROM,
    to,
    subject: `⏳ ${jumlahAtlet} Atlet ${namaKontingen} Menunggu Verifikasi — ${namaCabor}`,
    html: baseTemplate(content),
  })
}

// Email 2: Notifikasi ke KONIDA saat atlet diapprove/reject operator
export async function emailStatusAtlet(props: {
  to: string
  namaKonida: string
  namaAtlet: string
  status: string
  alasan?: string
  namaOperator: string
  namaCabor: string
}) {
  const { to, namaKonida, namaAtlet, status, alasan, namaOperator, namaCabor } = props
  const color = getStatusColor(status)
  const emoji = getStatusEmoji(status)
  const isApproved = status.includes('Verified') || status.includes('Menunggu Admin')
  const isRejected = status.includes('Ditolak')

  const content = `
    <div style="color:#94A3B8;font-size:14px;margin-bottom:24px;">
      Halo <strong style="color:white;">${namaKonida}</strong>,
    </div>

    <div style="background:#1E293B;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">${emoji}</div>
      <div style="color:${color};font-size:16px;font-weight:bold;">${status}</div>
      <div style="color:white;font-size:18px;font-weight:bold;margin-top:4px;">${namaAtlet}</div>
    </div>

    <div style="background:#0F172A;border:1px solid #1E293B;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#64748B;font-size:12px;">Cabang Olahraga</span>
        <span style="color:white;font-size:12px;font-weight:bold;">${namaCabor}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <span style="color:#64748B;font-size:12px;">Diproses oleh</span>
        <span style="color:white;font-size:12px;">${namaOperator}</span>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="color:#64748B;font-size:12px;">Status</span>
        <span style="color:${color};font-size:12px;font-weight:bold;">${status}</span>
      </div>
    </div>

    ${alasan && isRejected ? `
    <div style="background:#450A0A;border:1px solid #7F1D1D;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="color:#FCA5A5;font-size:11px;font-weight:bold;margin-bottom:8px;">ALASAN PENOLAKAN:</div>
      <div style="color:#FEE2E2;font-size:13px;">${alasan}</div>
    </div>
    ` : ''}

    ${isRejected ? `
    <div style="color:#94A3B8;font-size:13px;margin-bottom:24px;">
      Silakan perbaiki data atlet dan submit ulang melalui sistem.
    </div>
    <a href="https://porprov-xv.vercel.app/konida/atlet"
      style="display:block;background:#EF4444;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
      Perbaiki Data Atlet →
    </a>
    ` : `
    <div style="color:#94A3B8;font-size:13px;margin-bottom:24px;">
      ${isApproved
        ? 'Data atlet sudah diverifikasi dan akan diteruskan ke Admin KONI untuk verifikasi final.'
        : 'Pantau status atlet kamu di dashboard KONIDA.'}
    </div>
    <a href="https://porprov-xv.vercel.app/konida/atlet"
      style="display:block;background:#3B82F6;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
      Lihat Status Atlet →
    </a>
    `}
  `

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${emoji} ${namaAtlet} — ${status} | PORPROV XV`,
    html: baseTemplate(content),
  })
}

// Email 3: Notifikasi ke KONIDA saat Admin approve/reject
export async function emailVerifikasiAdmin(props: {
  to: string
  namaKonida: string
  namaAtlet: string
  status: string
  alasan?: string
}) {
  const { to, namaKonida, namaAtlet, status, alasan } = props
  const color = getStatusColor(status)
  const emoji = getStatusEmoji(status)
  const isPosted = status === 'Posted'
  const isRejected = status.includes('Ditolak')

  const content = `
    <div style="color:#94A3B8;font-size:14px;margin-bottom:24px;">
      Halo <strong style="color:white;">${namaKonida}</strong>,
    </div>

    <div style="background:#1E293B;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">${emoji}</div>
      <div style="color:${color};font-size:16px;font-weight:bold;">
        ${isPosted ? 'Atlet Resmi Terdaftar!' : status}
      </div>
      <div style="color:white;font-size:18px;font-weight:bold;margin-top:4px;">${namaAtlet}</div>
      ${isPosted ? `
      <div style="color:#10B981;font-size:12px;margin-top:8px;">
        ✅ Atlet sudah resmi terdaftar di PORPROV XV Jawa Barat 2026
      </div>
      ` : ''}
    </div>

    ${alasan && isRejected ? `
    <div style="background:#450A0A;border:1px solid #7F1D1D;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="color:#FCA5A5;font-size:11px;font-weight:bold;margin-bottom:8px;">ALASAN PENOLAKAN ADMIN:</div>
      <div style="color:#FEE2E2;font-size:13px;">${alasan}</div>
    </div>
    ` : ''}

    <a href="https://porprov-xv.vercel.app/konida/atlet"
      style="display:block;background:${color};color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
      ${isPosted ? 'Lihat Atlet Terdaftar →' : 'Perbaiki & Submit Ulang →'}
    </a>
  `

  return resend.emails.send({
    from: FROM,
    to,
    subject: `${emoji} ${namaAtlet} — ${isPosted ? 'Resmi Terdaftar PORPROV XV!' : status} | Admin KONI`,
    html: baseTemplate(content),
  })
}

// Email 4: Digest harian untuk Admin
export async function emailDailyDigest(props: {
  to: string
  totalPending: number
  totalVerified: number
  totalPosted: number
  topKontingen: Array<{ nama: string; pending: number }>
}) {
  const { to, totalPending, totalVerified, totalPosted, topKontingen } = props

  const content = `
    <div style="color:#94A3B8;font-size:14px;margin-bottom:24px;">
      Halo Admin, berikut ringkasan harian sistem PORPROV XV:
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:#1E293B;border-radius:12px;padding:16px;text-align:center;">
        <div style="color:#F59E0B;font-size:24px;font-weight:bold;">${totalPending}</div>
        <div style="color:#94A3B8;font-size:11px;margin-top:4px;">Menunggu Review</div>
      </div>
      <div style="background:#1E293B;border-radius:12px;padding:16px;text-align:center;">
        <div style="color:#10B981;font-size:24px;font-weight:bold;">${totalVerified}</div>
        <div style="color:#94A3B8;font-size:11px;margin-top:4px;">Verified</div>
      </div>
      <div style="background:#1E293B;border-radius:12px;padding:16px;text-align:center;">
        <div style="color:#3B82F6;font-size:24px;font-weight:bold;">${totalPosted}</div>
        <div style="color:#94A3B8;font-size:11px;margin-top:4px;">Posted</div>
      </div>
    </div>

    ${topKontingen.length > 0 ? `
    <div style="background:#1E293B;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="color:#94A3B8;font-size:11px;font-weight:bold;margin-bottom:12px;">
        KONTINGEN DENGAN ATLET PENDING TERBANYAK:
      </div>
      ${topKontingen.map(k => `
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #0F172A;">
          <span style="color:white;font-size:12px;">${k.nama}</span>
          <span style="color:#F59E0B;font-size:12px;font-weight:bold;">${k.pending} pending</span>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <a href="https://porprov-xv.vercel.app/dashboard/verifikasi"
      style="display:block;background:#1B3A6B;color:white;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:14px;">
      Buka Dashboard Admin →
    </a>
  `

  return resend.emails.send({
    from: FROM,
    to,
    subject: `📊 Digest Harian PORPROV XV — ${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    html: baseTemplate(content),
  })
}