// src/hooks/useFeatures.ts
// Hook untuk cek fitur subscription di komponen client
// Usage: const { can, features, plan } = useFeatures()

'use client'
import { useEffect, useState } from 'react'
import { F, type FeatureKey } from '../lib/subscriptions'

interface FeaturesState {
  features:    string[]
  plan_id:     string
  is_trial:    boolean
  valid_until: string | null
  loading:     boolean
}

// Singleton cache biar tidak refetch setiap render
let _cache: FeaturesState | null = null
let _fetchPromise: Promise<void> | null = null

async function fetchFeatures(): Promise<void> {
  if (_fetchPromise) return _fetchPromise
  _fetchPromise = fetch('/api/auth/me')
    .then(r => r.json())
    .then(data => {
      _cache = {
        features:    data.features    ?? [F.DASHBOARD_BASIC],
        plan_id:     data.plan_id     ?? 'basic',
        is_trial:    data.is_trial    ?? false,
        valid_until: data.subscription_valid_until ?? null,
        loading:     false,
      }
    })
    .catch(() => {
      _cache = {
        features:    [F.DASHBOARD_BASIC],
        plan_id:     'basic',
        is_trial:    false,
        valid_until: null,
        loading:     false,
      }
    })
    .finally(() => { _fetchPromise = null })
  return _fetchPromise
}

export function useFeatures() {
  const [state, setState] = useState<FeaturesState>(
    _cache ?? {
      features:    [F.DASHBOARD_BASIC],
      plan_id:     'basic',
      is_trial:    false,
      valid_until: null,
      loading:     true,
    }
  )

  useEffect(() => {
    if (_cache) { setState(_cache); return }
    fetchFeatures().then(() => { if (_cache) setState(_cache) })
  }, [])

  // Helper: cek satu fitur
  const can = (feature: FeatureKey): boolean =>
    state.features.includes(feature)

  // Helper: cek banyak fitur (semua harus ada)
  const canAll = (...features: FeatureKey[]): boolean =>
    features.every(f => state.features.includes(f))

  // Helper: cek salah satu fitur
  const canAny = (...features: FeatureKey[]): boolean =>
    features.some(f => state.features.includes(f))

  // Reset cache (dipanggil setelah upgrade plan)
  const invalidate = () => { _cache = null; fetchFeatures().then(() => { if (_cache) setState(_cache) }) }

  return { ...state, can, canAll, canAny, invalidate }
}

