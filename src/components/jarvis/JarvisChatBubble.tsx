'use client'
import { Sparkles, X } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  lastMessage: Message | null
  unread: number
  onExpand: () => void
  onClose: () => void
}

export function JarvisChatBubble({ lastMessage, unread, onExpand, onClose }: Props) {
  const preview = lastMessage
    ? lastMessage.content.slice(0, 60) + (lastMessage.content.length > 60 ? '…' : '')
    : 'Tap untuk lanjut obrolan'

  return (
    <div className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-2">
      <button onClick={onExpand}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] text-left max-w-[280px]"
        style={{
          background: 'linear-gradient(135deg, #1e1040, #0f0a2e)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 8px 32px rgba(124,58,237,0.35)',
        }}>
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)' }}>
            <Sparkles size={15} className="text-white" />
          </div>
          {unread > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: '#ef4444' }}>
              {unread > 9 ? '9+' : unread}
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-purple-400 mb-0.5">Jarvis QA</div>
          <div className="text-xs text-zinc-400 truncate leading-snug">{preview}</div>
        </div>
      </button>

      {/* Close completely */}
      <button onClick={onClose}
        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-400 transition-colors"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
        title="Tutup Jarvis">
        <X size={11} />
      </button>
    </div>
  )
}
