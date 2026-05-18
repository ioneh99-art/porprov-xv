// src/app/api/superadmin/invoices/route.ts
// CRUD invoices + send email + Midtrans

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

function requireSuperadmin(req: NextRequest): boolean {
  const session = req.cookies.get('porprov_session')?.value
  if (!session) return false
  try { return JSON.parse(session).role === 'superadmin' } catch { return false }
}

// ─── GET: list invoices ───────────────────────────────────
export async function GET(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error:'Unauthorized' }, { status:401 })

  const { data, error } = await sb
    .from('invoices')
    .select('*, kontingen(nama), invoice_items(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json(data)
}

// ─── POST: create invoice ─────────────────────────────────
export async function POST(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error:'Unauthorized' }, { status:401 })

  const body = await req.json()
  const {
    kontingen_id, plan_id, periode_mulai, periode_akhir,
    subtotal, pajak, total, due_date, email_to, catatan, items,
  } = body

  // Generate nomor invoice
  const { data: nomor } = await sb.rpc('generate_invoice_number')

  // Insert invoice
  const { data: inv, error: invErr } = await sb
    .from('invoices')
    .insert({
      nomor, kontingen_id, plan_id,
      periode_mulai, periode_akhir,
      subtotal: subtotal ?? 0,
      pajak:    pajak ?? 0,
      total:    total ?? 0,
      due_date, email_to, catatan,
      status: 'draft',
      created_by: 'superadmin',
    })
    .select().single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status:500 })

  // Insert items
  if (items?.length) {
    await sb.from('invoice_items').insert(
      items.map((item: any) => ({
        invoice_id:  inv.id,
        deskripsi:   item.deskripsi,
        qty:         item.qty ?? 1,
        harga:       item.harga ?? 0,
        subtotal:    (item.qty ?? 1) * (item.harga ?? 0),
      }))
    )
  }

  return NextResponse.json({ ok: true, invoice: inv })
}

// ─── PUT: update invoice ──────────────────────────────────
export async function PUT(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error:'Unauthorized' }, { status:401 })

  const body = await req.json()
  const { id, ...update } = body
  if (!id) return NextResponse.json({ error:'ID required' }, { status:400 })

  const { error } = await sb
    .from('invoices')
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status:500 })
  return NextResponse.json({ ok: true })
}

// ─── PATCH: send invoice (email + Midtrans) ───────────────
export async function PATCH(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error:'Unauthorized' }, { status:401 })

  const { id, action } = await req.json()
  if (!id) return NextResponse.json({ error:'ID required' }, { status:400 })

  // Ambil invoice + items
  const { data: inv } = await sb
    .from('invoices')
    .select('*, kontingen(nama), invoice_items(*)')
    .eq('id', id)
    .single()

  if (!inv) return NextResponse.json({ error:'Invoice tidak ditemukan' }, { status:404 })

  // ── Action: generate Midtrans payment link ────────────
  if (action === 'midtrans') {
    try {
      const mtServerKey = process.env.MIDTRANS_SERVER_KEY
      if (!mtServerKey) return NextResponse.json({ error:'Midtrans key tidak dikonfigurasi' }, { status:500 })

      const auth = Buffer.from(`${mtServerKey}:`).toString('base64')
      const payload = {
        transaction_details: {
          order_id:     inv.nomor,
          gross_amount: inv.total,
        },
        customer_details: {
          first_name: (inv.kontingen as any)?.nama ?? 'Kontingen',
          email:      inv.email_to ?? '',
        },
        item_details: (inv.invoice_items as any[]).map((item: any) => ({
          id:       item.id,
          price:    item.harga,
          quantity: item.qty,
          name:     item.deskripsi.slice(0, 50),
        })),
        callbacks: {
          finish: `${process.env.NEXT_PUBLIC_APP_URL}/superadmin/invoices`,
        },
      }

      const mtRes = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization:`Basic ${auth}` },
        body: JSON.stringify(payload),
      })
      const mtData = await mtRes.json()

      if (!mtData.token) return NextResponse.json({ error:'Midtrans gagal: ' + JSON.stringify(mtData) }, { status:500 })

      const paymentUrl = `https://app.sandbox.midtrans.com/snap/v2/vtweb/${mtData.token}`

      await sb.from('invoices').update({
        midtrans_url:   paymentUrl,
        midtrans_token: mtData.token,
        updated_at:     new Date().toISOString(),
      }).eq('id', id)

      return NextResponse.json({ ok: true, payment_url: paymentUrl, token: mtData.token })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status:500 })
    }
  }

  // ── Action: send email ────────────────────────────────
  if (action === 'send') {
    if (!inv.email_to) return NextResponse.json({ error:'Email penerima belum diset' }, { status:400 })

    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      const kontigenNama = (inv.kontingen as any)?.nama ?? 'Kontingen'
      const items = (inv.invoice_items as any[]) ?? []

      const itemsHtml = items.map((item: any) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${item.deskripsi}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center">${item.qty}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">Rp ${item.harga.toLocaleString('id-ID')}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:right">Rp ${item.subtotal.toLocaleString('id-ID')}</td>
        </tr>
      `).join('')

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ef4444,#f97316);padding:32px;text-align:center">
      <h1 style="color:white;margin:0;font-size:24px;font-weight:800">PORPROV XV</h1>
      <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Jawa Barat 2026 · Platform Manajemen Atlet</p>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <h2 style="font-size:18px;color:#1e293b;margin:0 0 4px">Invoice ${inv.nomor}</h2>
      <p style="color:#64748b;font-size:13px;margin:0 0 24px">Kepada: <b>${kontigenNama}</b></p>

      <!-- Invoice Info -->
      <div style="background:#f8fafc;border-radius:8px;padding:16px;margin-bottom:24px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div>
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Nomor Invoice</div>
          <div style="font-size:14px;font-weight:600;color:#1e293b">${inv.nomor}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Jatuh Tempo</div>
          <div style="font-size:14px;font-weight:600;color:#ef4444">${inv.due_date ? new Date(inv.due_date).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : '-'}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Periode</div>
          <div style="font-size:14px;font-weight:600;color:#1e293b">${inv.periode_mulai} s/d ${inv.periode_akhir}</div>
        </div>
        <div>
          <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px">Plan</div>
          <div style="font-size:14px;font-weight:600;color:#1e293b">${inv.plan_id}</div>
        </div>
      </div>

      <!-- Items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:10px 12px;text-align:left;font-size:11px;color:#64748b;text-transform:uppercase">Deskripsi</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;color:#64748b;text-transform:uppercase">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Harga</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;color:#64748b;text-transform:uppercase">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- Total -->
      <div style="border-top:2px solid #f1f5f9;padding-top:16px;text-align:right">
        ${inv.pajak > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#64748b;font-size:13px">Subtotal</span>
          <span style="color:#1e293b;font-size:13px">Rp ${inv.subtotal.toLocaleString('id-ID')}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:#64748b;font-size:13px">Pajak</span>
          <span style="color:#1e293b;font-size:13px">Rp ${inv.pajak.toLocaleString('id-ID')}</span>
        </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding:12px;background:#fef3c7;border-radius:8px">
          <span style="color:#92400e;font-weight:700;font-size:15px">TOTAL</span>
          <span style="color:#92400e;font-weight:800;font-size:18px">Rp ${inv.total.toLocaleString('id-ID')}</span>
        </div>
      </div>

      ${inv.midtrans_url ? `
      <!-- Payment Button -->
      <div style="text-align:center;margin-top:28px">
        <p style="color:#64748b;font-size:13px;margin-bottom:16px">Silakan lakukan pembayaran melalui link berikut:</p>
        <a href="${inv.midtrans_url}"
          style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:white;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none">
          💳 Bayar Sekarang
        </a>
      </div>` : ''}

      ${inv.catatan ? `
      <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border-left:3px solid #e2e8f0">
        <p style="color:#64748b;font-size:12px;margin:0"><b>Catatan:</b> ${inv.catatan}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #f1f5f9">
      <p style="color:#94a3b8;font-size:11px;margin:0">PORPROV XV Jawa Barat 2026 · Powered by KONI Jabar</p>
      <p style="color:#cbd5e1;font-size:10px;margin:4px 0 0">Invoice ini digenerate otomatis oleh sistem</p>
    </div>
  </div>
</body>
</html>`

      await resend.emails.send({
        from:    'PORPROV XV <noreply@porprov.id>',
        to:      [inv.email_to],
        subject: `Invoice ${inv.nomor} — ${kontigenNama} · PORPROV XV 2026`,
        html,
      })

      await sb.from('invoices').update({
        status:     'sent',
        sent_at:    new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', id)

      return NextResponse.json({ ok: true, message: 'Email terkirim' })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status:500 })
    }
  }

  // ── Action: mark as paid ──────────────────────────────
  if (action === 'paid') {
    await sb.from('invoices').update({
      status:     'paid',
      paid_at:    new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    // Aktifkan subscription jika belum aktif
    const { data: sub } = await sb
      .from('subscriptions')
      .select('id, is_active')
      .eq('kontingen_id', inv.kontingen_id)
      .eq('plan_id', inv.plan_id)
      .single()

    if (sub && !sub.is_active) {
      await sb.from('subscriptions').update({ is_active: true }).eq('id', sub.id)
    }

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action tidak dikenali' }, { status:400 })
}

// ─── DELETE: hapus invoice draft ─────────────────────────
export async function DELETE(req: NextRequest) {
  if (!requireSuperadmin(req))
    return NextResponse.json({ error:'Unauthorized' }, { status:401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error:'ID required' }, { status:400 })

  // Hanya bisa hapus draft
  const { data: inv } = await sb.from('invoices').select('status').eq('id', id).single()
  if (inv?.status !== 'draft')
    return NextResponse.json({ error:'Hanya invoice draft yang bisa dihapus' }, { status:400 })

  await sb.from('invoice_items').delete().eq('invoice_id', id)
  await sb.from('invoices').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}