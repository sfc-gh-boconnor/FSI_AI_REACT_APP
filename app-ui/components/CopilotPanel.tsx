"use client"
import { useState, useRef, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type Message = { role: "user" | "assistant"; content: string; streaming?: boolean }

const SUGGESTIONS = [
  "What drove Snowflake's Q3 FY2025 earnings beat?",
  "Why did NRNT go bankrupt — what were the warning signs?",
  "Compare SNOW sentiment across Q1, Q2 and Q3 FY2025",
  "What do analysts say about Snowflake's AI revenue potential?",
  "How did NRNT social sentiment decline before bankruptcy?",
  "What is Snowflake's competitive position in AI data cloud?",
]

export function CopilotPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your FSI AI Copilot, powered by Snowflake Cortex.\n\nI have access to:\n- **SNOW** earnings call transcripts (Q1–Q3 FY2025) with AI sentiment analysis\n- **30 analyst reports** on Snowflake from top research providers\n- **NRNT** social intelligence — 4,391 posts tracking the Neuro-Nectar bankruptcy\n- **Live stock data** for SNOW (NYSE)\n\nAsk me anything about these companies, financial signals, or AI-powered investment research.",
    }
  ])
  const [input, setInput]     = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = async (question?: string) => {
    const q = (question ?? input).trim()
    if (!q || loading) return
    setInput("")
    setLoading(true)

    const userMsg: Message = { role: "user", content: q }
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "", streaming: true }])

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split("\n")
        buf = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") break
          try {
            const { token } = JSON.parse(payload)
            setMessages(prev => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last.role === "assistant") updated[updated.length - 1] = { ...last, content: last.content + token }
              return updated
            })
          } catch { /* skip */ }
        }
      }
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === "assistant") updated[updated.length - 1] = { ...last, streaming: false }
        return updated
      })
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (last.role === "assistant") updated[updated.length - 1] = { ...last, content: "Sorry, I encountered an error. Please try again.", streaming: false }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ height: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>
      <div className="card-header">
        <span className="card-title">AI Copilot — FSI Intelligence</span>
        <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>
          Powered by AI_COMPLETE · claude-sonnet-4-5
        </span>
      </div>

      {/* Suggestions */}
      <div className="chat-suggestions">
        {SUGGESTIONS.map(s => (
          <button key={s} className="chat-suggest-btn" onClick={() => send(s)}>{s}</button>
        ))}
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <div className="chat-bubble">
              {m.role === "assistant" ? (
                <>
                  {m.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : null}
                  {m.streaming && <span className="cursor" />}
                  {!m.streaming && !m.content && <span style={{ color: "var(--text-muted)" }}>Thinking…</span>}
                </>
              ) : m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about SNOW earnings, NRNT bankruptcy, analyst research…"
          disabled={loading}
        />
        <button className="chat-send" onClick={() => send()} disabled={loading || !input.trim()}>
          {loading ? "…" : "Send"}
        </button>
      </div>
    </div>
  )
}
