import type { Atlet, JarvisIssue } from '../types'

export function detectDuplicates(athletes: Atlet[]): JarvisIssue[] {
  const issues: JarvisIssue[] = []

  // Duplicate nama (normalized)
  const nameMap = new Map<string, Atlet[]>()
  for (const a of athletes) {
    if (!a.nama_lengkap) continue
    const key = a.nama_lengkap.toUpperCase().trim().replace(/\s+/g, ' ')
    if (!nameMap.has(key)) nameMap.set(key, [])
    nameMap.get(key)!.push(a)
  }
  nameMap.forEach((group, name) => {
    if (group.length < 2) return
    const ids = group.map((a: Atlet) => a.id)
    issues.push({
      issue_type: 'duplicate',
      severity: 'critical',
      source_record_id: group[0].id,
      related_record_ids: ids,
      title: `Duplikat nama: ${name}`,
      description: `${group.length} atlet dengan nama sama (IDs: ${ids.join(', ')})`,
      suggested_action: 'Review semua entry, merge atau hapus yang duplikat',
      raw_data: { name, duplicates: group.map((a: Atlet) => ({ id: a.id, nik: a.no_ktp, status: a.status_verifikasi })) },
    })
  })

  // Duplicate NIK
  const nikMap = new Map<string, Atlet[]>()
  for (const a of athletes) {
    if (!a.no_ktp) continue
    const key = String(a.no_ktp).trim()
    if (!nikMap.has(key)) nikMap.set(key, [])
    nikMap.get(key)!.push(a)
  }
  nikMap.forEach((group, nik) => {
    if (group.length < 2) return
    const ids = group.map((a: Atlet) => a.id)
    issues.push({
      issue_type: 'duplicate',
      severity: 'critical',
      source_record_id: group[0].id,
      related_record_ids: ids,
      title: `Duplikat NIK: ${nik}`,
      description: `${group.length} atlet dengan NIK sama (IDs: ${ids.join(', ')})`,
      suggested_action: 'NIK harus unique — investigate immediately',
      raw_data: { nik, duplicates: group.map((a: Atlet) => ({ id: a.id, nama: a.nama_lengkap, status: a.status_verifikasi })) },
    })
  })

  return issues
}
