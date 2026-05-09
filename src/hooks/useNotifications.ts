import { useEffect, useState } from 'react'

export function useNotifications(user: any) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  const fetchCounts = async () => {
    if (!user?.role) return
    try {
      const params = new URLSearchParams({
        role: user.role,
        ...(user.kontingen_id && { kontingen_id: user.kontingen_id }),
        ...(user.cabor_id && { cabor_id: user.cabor_id }),
      })
      const res = await fetch(`/api/notifications?${params}`)
      const data = await res.json()
      setCounts(data)
    } catch {}
  }

  useEffect(() => {
    fetchCounts()
    // Refresh setiap 30 detik
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [user])

  return counts
}