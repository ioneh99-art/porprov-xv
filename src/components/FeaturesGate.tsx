// src/components/FeatureGate.tsx
// Komponen JSX untuk gate fitur — import dari sini bukan dari useFeatures
'use client'
import { useFeatures } from '@/hooks/useFeatures'
import type { FeatureKey } from '@/lib/subscriptions'

interface FeatureGateProps {
  feature:   FeatureKey
  fallback?: React.ReactNode
  children:  React.ReactNode
}

export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const { can, loading } = useFeatures()
  if (loading) return null
  if (!can(feature)) return <>{fallback ?? null}</>
  return <>{children}</>
}

export function UpgradePrompt({ planRequired }: { planRequired?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
        <span className="text-2xl">🔒</span>
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-2">Fitur Tidak Tersedia</h3>
      <p className="text-sm text-gray-400 mb-4 max-w-xs">
        {planRequired
          ? `Membutuhkan paket ${planRequired} atau lebih tinggi.`
          : 'Fitur ini tidak tersedia di paket Anda saat ini.'}
      </p>
      <a href="mailto:admin@porprov.id"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
        Hubungi Admin untuk Upgrade
      </a>
    </div>
  )
}