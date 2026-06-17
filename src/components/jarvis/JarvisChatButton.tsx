'use client'
import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { JarvisChatModal } from './JarvisChatModal'

export function JarvisChatButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[150] flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm text-white shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
        <Sparkles size={16} />
        Ask Jarvis
      </button>
      {open && <JarvisChatModal onClose={() => setOpen(false)} />}
    </>
  )
}
