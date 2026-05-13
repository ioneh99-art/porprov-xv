"use client";

/**
 * SipaAIFloat.tsx
 * Floating AI Assistant button untuk Porprov XV
 *
 * CARA PAKAI:
 * 1. Copy file ini ke: components/SipaAIFloat.tsx
 * 2. Tambahkan ke layout utama: app/layout.tsx
 *    import SipaAIFloat from "@/components/SipaAIFloat";
 *    <SipaAIFloat />
 * 3. Set env variable (opsional, default localhost):
 *    NEXT_PUBLIC_SIPA_URL=https://sipa-engine.railway.app
 */

import { useState, useRef, useEffect, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const SIPA_URL =
  process.env.NEXT_PUBLIC_SIPA_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────
type Role = "user" | "ai" | "error";

interface Message {
  id: string;
  role: Role;
  text: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  duration_ms?: number;
  timestamp: Date;
}

// ── Quick suggestions per halaman ─────────────────────────────────────────────
const SUGGESTIONS: Record<string, string[]> = {
  "/atlet":        ["Atlet renang perempuan", "Atlet dari Kota Bandung", "Jumlah atlet per cabor"],
  "/klasemen":     ["Klasemen medali terbaru", "Kontingen terbanyak emas", "Bandingkan 3 kontingen teratas"],
  "/jadwal":       ["Jadwal pertandingan hari ini", "Pertandingan di GOR Pajajaran", "Cabor apa saja besok"],
  "/hasil":        ["Juara lari 100m putra", "Hasil renang putri terbaru", "Top 3 per nomor pertandingan"],
  "/kontingen":    ["Daftar semua kontingen", "Kontingen dengan atlet terbanyak"],
  "default":       ["Daftar atlet dari Bandung", "Klasemen medali terkini", "Jadwal pertandingan besok", "Hasil pertandingan renang"],
};

function getSuggestions(pathname: string): string[] {
  for (const [key, val] of Object.entries(SUGGESTIONS)) {
    if (key !== "default" && pathname.startsWith(key)) return val;
  }
  return SUGGESTIONS["default"];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function TableResult({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) return (
    <p style={{ color: "var(--sipa-muted)", fontSize: 12, marginTop: 6 }}>
      Tidak ada data ditemukan.
    </p>
  );
  const cols = Object.keys(rows[0]);
  return (
    <div style={{ overflowX: "auto", marginTop: 8, borderRadius: 8, border: "1px solid var(--sipa-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr style={{ background: "var(--sipa-surface2)" }}>
            {cols.map(c => (
              <th key={c} style={{
                padding: "6px 10px", textAlign: "left", fontWeight: 500,
                color: "var(--sipa-muted)", whiteSpace: "nowrap",
                borderBottom: "1px solid var(--sipa-border)",
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "var(--sipa-surface2)" }}>
              {cols.map(c => (
                <td key={c} style={{
                  padding: "5px 10px", color: "var(--sipa-text)",
                  borderBottom: "1px solid var(--sipa-border)", whiteSpace: "nowrap",
                }}>
                  {r[c] !== null && r[c] !== undefined ? String(r[c]) : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SQLBadge({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div style={{
      marginTop: 8, background: "var(--sipa-surface2)",
      border: "1px solid var(--sipa-border)", borderRadius: 8,
      padding: "8px 10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--sipa-accent)", fontFamily: "monospace", fontWeight: 600, letterSpacing: 1 }}>
          SQL
        </span>
        <button onClick={copy} style={{
          fontSize: 10, color: copied ? "var(--sipa-accent)" : "var(--sipa-muted)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}>
          {copied ? "✓ Disalin" : "Salin"}
        </button>
      </div>
      <code style={{
        fontSize: 10, color: "var(--sipa-text)", fontFamily: "monospace",
        whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5,
      }}>
        {sql}
      </code>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SipaAIFloat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSQL, setShowSQL] = useState(false);
  const [pathname, setPathname] = useState("/");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, messages]);

  const sendMessage = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;

    const userMsg: Message = { id: uid(), role: "user", text: q, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${SIPA_URL}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pertanyaan: q, per_page: 20 }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Terjadi kesalahan");
      }

      const rows = Array.isArray(data.data) ? data.data : [];
      const aiMsg: Message = {
        id: uid(),
        role: "ai",
        text: rows.length > 0
          ? `Ditemukan ${rows.length} data${data.meta?.duration_ms ? ` (${data.meta.duration_ms}ms)` : ""}`
          : "Tidak ada data yang cocok untuk pertanyaan ini.",
        sql: data.sql,
        rows,
        duration_ms: data.meta?.duration_ms,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

    } catch (e: unknown) {
      const errMsg: Message = {
        id: uid(),
        role: "error",
        text: e instanceof Error ? e.message : "Tidak dapat terhubung ke SIPA AI.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const suggestions = getSuggestions(pathname);

  return (
    <>
      {/* ── CSS Variables & Styles ── */}
      <style>{`
        :root {
          --sipa-accent: #10b981;
          --sipa-accent-dim: rgba(16,185,129,0.15);
          --sipa-surface: #0f172a;
          --sipa-surface2: rgba(255,255,255,0.04);
          --sipa-border: rgba(255,255,255,0.08);
          --sipa-text: #e2e8f0;
          --sipa-muted: #64748b;
          --sipa-radius: 16px;
          --sipa-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06);
        }
        @media (prefers-color-scheme: light) {
          :root {
            --sipa-surface: #ffffff;
            --sipa-surface2: rgba(0,0,0,0.03);
            --sipa-border: rgba(0,0,0,0.08);
            --sipa-text: #0f172a;
            --sipa-muted: #94a3b8;
            --sipa-shadow: 0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06);
          }
        }
        .sipa-panel {
          animation: sipaSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes sipaSlideUp {
          from { opacity: 0; transform: translateY(-12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .sipa-btn-float {
          animation: sipaPulse 3s ease-in-out infinite;
        }
        @keyframes sipaPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4), 0 8px 24px rgba(0,0,0,0.3); }
          50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0), 0 8px 24px rgba(0,0,0,0.3); }
        }
        .sipa-chip {
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .sipa-chip:hover {
          background: var(--sipa-accent-dim) !important;
          border-color: var(--sipa-accent) !important;
          color: var(--sipa-accent) !important;
        }
        .sipa-send:hover { background: #059669 !important; }
        .sipa-send:active { transform: scale(0.95); }
        .sipa-dot {
          animation: sipaDot 1.4s ease-in-out infinite;
        }
        .sipa-dot:nth-child(2) { animation-delay: 0.2s; }
        .sipa-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes sipaDot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
          40%          { transform: scale(1); opacity: 1; }
        }
        .sipa-input::placeholder { color: var(--sipa-muted); }
        .sipa-msg-enter {
          animation: sipaMsgIn 0.2s ease;
        }
        @keyframes sipaMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* ── Float Button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="sipa-btn-float"
          aria-label="Buka SIPA AI Assistant"
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            width: 56, height: 56, borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981, #059669)",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: 22,
          }}
        >
          ✦
        </button>
      )}

      {/* ── Chat Panel ── */}
      {open && (
        <div
          className="sipa-panel"
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            width: 380, maxWidth: "calc(100vw - 32px)",
            height: 560, maxHeight: "calc(100vh - 56px)",
            background: "var(--sipa-surface)",
            borderRadius: "var(--sipa-radius)",
            boxShadow: "var(--sipa-shadow)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            border: "1px solid var(--sipa-border)",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "14px 16px", display: "flex", alignItems: "center",
            justifyContent: "space-between", flexShrink: 0,
            borderBottom: "1px solid var(--sipa-border)",
            background: "var(--sipa-surface2)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981, #059669)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "white", flexShrink: 0,
              }}>✦</div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "var(--sipa-text)" }}>
                  SIPA Intelligence
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--sipa-accent)" }}>
                  ● Online · AI PORPROV
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Toggle SQL */}
              <button
                onClick={() => setShowSQL(s => !s)}
                title="Toggle tampilkan SQL"
                style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 6,
                  background: showSQL ? "var(--sipa-accent-dim)" : "var(--sipa-surface2)",
                  color: showSQL ? "var(--sipa-accent)" : "var(--sipa-muted)",
                  border: `1px solid ${showSQL ? "var(--sipa-accent)" : "var(--sipa-border)"}`,
                  cursor: "pointer", fontFamily: "monospace", fontWeight: 600,
                }}
              >
                SQL
              </button>
              {/* Clear */}
              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  title="Hapus riwayat"
                  style={{
                    fontSize: 16, color: "var(--sipa-muted)", background: "none",
                    border: "none", cursor: "pointer", padding: "2px 4px", lineHeight: 1,
                  }}
                >×</button>
              )}
              {/* Close */}
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                style={{
                  fontSize: 18, color: "var(--sipa-muted)", background: "none",
                  border: "none", cursor: "pointer", padding: "2px 4px", lineHeight: 1,
                }}
              >⌃</button>
            </div>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {/* Welcome */}
            {messages.length === 0 && (
              <div style={{ textAlign: "center", paddingTop: 20 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✦</div>
                <p style={{ color: "var(--sipa-text)", fontWeight: 600, fontSize: 14, margin: "0 0 4px" }}>
                  Tanya apa saja tentang PORPROV
                </p>
                <p style={{ color: "var(--sipa-muted)", fontSize: 12, margin: "0 0 20px" }}>
                  Atlet · Klasemen · Jadwal · Hasil pertandingan
                </p>
                {/* Suggestions */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="sipa-chip"
                      style={{
                        fontSize: 11, padding: "5px 10px", borderRadius: 20,
                        background: "var(--sipa-surface2)", color: "var(--sipa-muted)",
                        border: "1px solid var(--sipa-border)", cursor: "pointer",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map(msg => (
              <div key={msg.id} className="sipa-msg-enter" style={{
                display: "flex",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
                gap: 8, alignItems: "flex-start",
              }}>
                {msg.role !== "user" && (
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                    background: msg.role === "error"
                      ? "rgba(239,68,68,0.2)"
                      : "linear-gradient(135deg, #10b981, #059669)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: msg.role === "error" ? "#ef4444" : "white",
                    marginTop: 2,
                  }}>
                    {msg.role === "error" ? "!" : "✦"}
                  </div>
                )}
                <div style={{ maxWidth: "82%", minWidth: 0 }}>
                  {/* Bubble */}
                  <div style={{
                    padding: "8px 12px", borderRadius: msg.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : msg.role === "error"
                        ? "rgba(239,68,68,0.1)"
                        : "var(--sipa-surface2)",
                    border: msg.role === "user" ? "none"
                      : msg.role === "error"
                        ? "1px solid rgba(239,68,68,0.3)"
                        : "1px solid var(--sipa-border)",
                    color: msg.role === "user" ? "white" : msg.role === "error" ? "#ef4444" : "var(--sipa-text)",
                    fontSize: 13, lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>

                  {/* SQL (toggle) */}
                  {showSQL && msg.sql && msg.role === "ai" && (
                    <SQLBadge sql={msg.sql} />
                  )}

                  {/* Table */}
                  {msg.rows && msg.rows.length > 0 && (
                    <TableResult rows={msg.rows} />
                  )}

                  {/* Timestamp */}
                  <p style={{
                    fontSize: 10, color: "var(--sipa-muted)", margin: "3px 2px 0",
                    textAlign: msg.role === "user" ? "right" : "left",
                  }}>
                    {msg.timestamp.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {/* Loading dots */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "white", flexShrink: 0,
                }}>✦</div>
                <div style={{
                  padding: "10px 14px", borderRadius: "4px 12px 12px 12px",
                  background: "var(--sipa-surface2)", border: "1px solid var(--sipa-border)",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="sipa-dot" style={{
                      width: 6, height: 6, borderRadius: "50%", background: "var(--sipa-accent)",
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Suggestions bar (saat sudah ada pesan) */}
          {messages.length > 0 && !loading && (
            <div style={{
              padding: "6px 14px", display: "flex", gap: 6, overflowX: "auto",
              borderTop: "1px solid var(--sipa-border)", flexShrink: 0,
            }}>
              {suggestions.slice(0, 3).map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="sipa-chip"
                  style={{
                    fontSize: 10, padding: "4px 10px", borderRadius: 20, flexShrink: 0,
                    background: "var(--sipa-surface2)", color: "var(--sipa-muted)",
                    border: "1px solid var(--sipa-border)", cursor: "pointer",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: "10px 14px 14px", flexShrink: 0,
            borderTop: messages.length > 0 ? "none" : "1px solid var(--sipa-border)",
          }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "center",
              background: "var(--sipa-surface2)", borderRadius: 12,
              border: "1px solid var(--sipa-border)", padding: "6px 6px 6px 12px",
            }}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="Tanya tentang atlet, jadwal, klasemen..."
                disabled={loading}
                className="sipa-input"
                style={{
                  flex: 1, background: "none", border: "none", outline: "none",
                  color: "var(--sipa-text)", fontSize: 13,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="sipa-send"
                aria-label="Kirim"
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: input.trim() && !loading ? "#10b981" : "var(--sipa-border)",
                  border: "none", cursor: input.trim() && !loading ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "white", fontSize: 14, transition: "all 0.15s ease",
                }}
              >
                ↑
              </button>
            </div>
            <p style={{ fontSize: 10, color: "var(--sipa-muted)", textAlign: "center", margin: "6px 0 0" }}>
              SIPA AI · Groq + Cerebras · Data PORPROV real-time
            </p>
          </div>
        </div>
      )}
    </>
  );
}