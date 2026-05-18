// src/hooks/useFeatures.ts
// TANPA JSX — pisahkan FeatureGate ke file .tsx terpisah
'use client'
import { useEffect, useState } from 'react'
import { F, type FeatureKey } from '@/lib/subscriptions'

interface FeaturesState {
  features:    string[]
  plan_id:     string
  is_trial:    boolean
  valid_until: string | null
  loading:     boolean
}

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
        features: [F.DASHBOARD_BASIC], plan_id: 'basic',
        is_trial: false, valid_until: null, loading: false,
      }
    })
    .finally(() => { _fetchPromise = null })
  return _fetchPromise
}

export function useFeatures() {
  const [state, setState] = useState<FeaturesState>(
    _cache ?? {
      features: [F.DASHBOARD_BASIC], plan_id: 'basic',
      is_trial: false, valid_until: null, loading: true,
    }
  )

  useEffect(() => {
    if (_cache) { setState(_cache); return }
    fetchFeatures().then(() => { if (_cache) setState(_cache) })
  }, [])

  const can    = (f: FeatureKey) => state.features.includes(f)
  const canAll = (...fs: FeatureKey[]) => fs.every(f => state.features.includes(f))
  const canAny = (...fs: FeatureKey[]) => fs.some(f => state.features.includes(f))
  const invalidate = () => {
    _cache = null
    fetchFeatures().then(() => { if (_cache) setState(_cache) })
  }

  return { ...state, can, canAll, canAny, invalidate }
}