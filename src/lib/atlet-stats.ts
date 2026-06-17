import { SupabaseClient } from '@supabase/supabase-js'

export interface AtletStatsBandung {
  total: number

  // Status registrasi (field: status_registrasi) — admin workflow
  verified: number
  pending: number
  ditolak: number
  posted: number

  // Status verifikasi KONI (field: status_verifikasi)
  koni_verified: number
  koni_approved: number
  koni_rejected: number

  // Data Quality (field: data_quality_status)
  dq_ok: number
  dq_locked: number
  dq_fixed: number
  dq_invest: number
  dq_unsync: number

  // Tes Fisik Rating (field: tes_fisik_rating — denormalized dari atlet_tes_fisik)
  tf_elite: number
  tf_ready: number
  tf_needs_work: number
  tf_sub_par: number
  tf_kritis: number
  tf_tidak_hadir: number
  tf_belum: number

  // Demografi
  non_lokal: number
  gender_l: number
  gender_p: number
}

export async function getAtletStatsBandung(
  supabase: SupabaseClient,
  kontingenId = 4,
): Promise<AtletStatsBandung> {
  const KODE_LOKAL = '3204'

  let all: any[] = []
  for (let p = 0; ; p++) {
    const { data, error } = await supabase
      .from('atlet')
      .select('status_registrasi,status_verifikasi,data_quality_status,is_locked,tes_fisik_rating,no_ktp,gender,kode_asal_daerah')
      .eq('kontingen_id', kontingenId)
      .range(p * 1000, (p + 1) * 1000 - 1)
    if (error || !data || data.length === 0) break
    all = all.concat(data)
    if (data.length < 1000) break
  }

  return {
    total: all.length,

    verified:  all.filter(a => a.status_registrasi === 'Verified').length,
    pending:   all.filter(a => a.status_registrasi === 'Menunggu Admin').length,
    ditolak:   all.filter(a => a.status_registrasi === 'Ditolak Admin').length,
    posted:    all.filter(a => a.status_registrasi === 'Posted').length,

    koni_verified: all.filter(a => a.status_verifikasi === 'Verified').length,
    koni_approved: all.filter(a => a.status_verifikasi === 'Approved Cabor').length,
    koni_rejected: all.filter(a => a.status_verifikasi === 'Rejected').length,

    dq_ok:     all.filter(a => a.data_quality_status === 'ok').length,
    dq_locked: all.filter(a => a.data_quality_status === 'manual_review_required').length,
    dq_fixed:  all.filter(a => a.data_quality_status === 'fixed_by_system').length,
    dq_invest: all.filter(a => a.data_quality_status === 'investigation_required').length,
    dq_unsync: all.filter(a => !a.data_quality_status || a.data_quality_status === 'unverified').length,

    tf_elite:       all.filter(a => a.tes_fisik_rating === '⭐ ELITE').length,
    tf_ready:       all.filter(a => a.tes_fisik_rating === '✅ READY').length,
    tf_needs_work:  all.filter(a => a.tes_fisik_rating === '🟡 NEEDS WORK').length,
    tf_sub_par:     all.filter(a => a.tes_fisik_rating === '🔴 SUB-PAR').length,
    tf_kritis:      all.filter(a => a.tes_fisik_rating === '🚨 KRITIS').length,
    tf_tidak_hadir: all.filter(a => a.tes_fisik_rating === '⚠️ Tidak Hadir').length,
    tf_belum:       all.filter(a => !a.tes_fisik_rating).length,

    non_lokal: all.filter(a => a.kode_asal_daerah && !a.kode_asal_daerah.toString().startsWith(KODE_LOKAL)).length,
    gender_l:  all.filter(a => a.gender === 'L').length,
    gender_p:  all.filter(a => a.gender === 'P').length,
  }
}
