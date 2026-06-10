"use client"
import { useRef, useState } from "react"

const EVIDENCE_IMAGES = [
  { filename: "ceo_neuro_nectar_leaving_office_gone_bust.png", label: "CEO's Exit" },
  { filename: "icecream_in_landfill_recall.png",               label: "The Recall" },
  { filename: "dev_team_icecream.png",                         label: "Dev Team" },
]

const IMAGE_CAPTIONS: Record<string, string> = {
  "ceo_neuro_nectar_leaving_office_gone_bust.png": "Dr. Marcus Sterling departs NRNT headquarters for the last time, November 20th, 2024.",
  "icecream_in_landfill_recall.png":               "28 million units of Neuro-Nectar await disposal following the emergency FDA recall.",
  "dev_team_icecream.png":                         "The NRNT engineering team, photographed in October 2024, consuming their own product.",
  "eating_icecream.png":                           "An early Neuro-Nectar customer, photographed before the FDA warning.",
  "icecream_brainfog_gone.png":                    "The promised effect. Reality proved more complex.",
  "neuro_icecream.png":                            "Neuro-Nectar's flagship product, as seen in Q2 2024 marketing materials.",
  "chinese_man_not_happy_angry_icecream.png":      "A retail investor reacts to NRNT's 90% stock decline.",
}

type TranscribeState = "idle" | "loading" | "done" | "error"
type ArticleState    = "idle" | "loading" | "streaming" | "done"

// ── Newspaper renderer ────────────────────────────────────────────────────────
// Splits article on [IMAGE:filename] markers.
// Headline (## …) spans both columns. Images get a full-width photo block.

function NewspaperArticle({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  // Extract headline (## line) for full-width display above the columns
  const headlineMatch = text.match(/^##\s+(.+)$/m)
  const headline = headlineMatch ? headlineMatch[1] : null
  const bodyText = (headline ? text.replace(/^##\s+.+$/m, "").trim() : text)

  // Split body on [IMAGE:filename] markers → alternating text/image segments
  const segments = bodyText.split(/(\[IMAGE:[^\]]+\])/)

  function mdToHtml(chunk: string) {
    return chunk
      .replace(/^>\s+(.+)$/gm,
        '<blockquote style="border-left:3px solid var(--primary);padding:0.3rem 0.6rem;margin:0.5rem 0;color:#93c5fd;font-style:italic;font-size:0.93em">$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\n\n+/g, '</p><p style="margin:0 0 0.65em 0">')
      .replace(/\n/g, "<br/>")
  }

  // Split a text block into two roughly equal halves at a paragraph boundary
  function splitTwoColumns(chunk: string): [string, string] {
    const paras = chunk.split(/\n\n+/).filter(p => p.trim())
    if (paras.length <= 1) return [chunk, ""]
    const mid = Math.ceil(paras.length / 2)
    return [paras.slice(0, mid).join("\n\n"), paras.slice(mid).join("\n\n")]
  }

  const colStyle: React.CSSProperties = {
    fontSize: "0.875rem",
    lineHeight: 1.75,
    textAlign: "justify",
    fontFamily: "Georgia, 'Times New Roman', serif",
    color: "var(--text)",
  }

  return (
    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", color: "var(--text)" }}>

      {/* Masthead */}
      <div style={{ borderTop: "3px solid var(--text)", borderBottom: "1px solid var(--text)", padding: "0.35rem 0", marginBottom: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "#94a3b8", letterSpacing: "0.05em" }}>
        <span style={{ fontWeight: 700, textTransform: "uppercase" }}>The Financial Farce</span>
        <span>Exclusive Investigation</span>
        <span>NRNT · Special Report</span>
      </div>

      {/* Full-width headline */}
      {headline && (
        <h2 style={{ fontSize: "1.55rem", fontWeight: 900, lineHeight: 1.2, margin: "0 0 0.75rem", color: "var(--loss)", textAlign: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
          {headline}
        </h2>
      )}

      {/* Render each segment: text blocks as 2-col grid, images as full-width */}
      {segments.map((seg, i) => {
        const imgMatch = seg.match(/^\[IMAGE:([^\]]+)\]$/)

        // ── Image: full-width spanning both columns ──
        if (imgMatch) {
          const filename = imgMatch[1].trim()
          const caption = IMAGE_CAPTIONS[filename] ?? filename
          return (
            <figure key={i} style={{ margin: "1.25rem 0" }}>
              <img
                src={`/images/${filename}`}
                alt={caption}
                style={{ width: "100%", maxHeight: "260px", objectFit: "cover", display: "block", borderRadius: "3px", border: "1px solid var(--border)" }}
              />
              <figcaption style={{ fontSize: "0.72rem", color: "#94a3b8", fontStyle: "italic", marginTop: "0.3rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.35rem" }}>
                {caption}
              </figcaption>
            </figure>
          )
        }

        // ── Text block: split into two columns side by side ──
        if (!seg.trim()) return null
        const [left, right] = splitTwoColumns(seg.trim())
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.75rem", marginBottom: "0.5rem" }}>
            <div style={colStyle}>
              <p style={{ margin: "0 0 0.65em 0" }} dangerouslySetInnerHTML={{ __html: mdToHtml(left) }} />
            </div>
            <div style={{ ...colStyle, borderLeft: "1px solid var(--border)", paddingLeft: "1.75rem" }}>
              {right ? (
                <p style={{ margin: "0 0 0.65em 0" }} dangerouslySetInnerHTML={{ __html: mdToHtml(right) }} />
              ) : (
                isStreaming && i === segments.length - 1
                  ? <span style={{ display: "inline-block", width: "7px", height: "1em", background: "var(--primary)", animation: "blink 1s step-end infinite", verticalAlign: "text-bottom" }} />
                  : null
              )}
            </div>
          </div>
        )
      })}

      {/* Cursor on final segment when still streaming */}
      {isStreaming && (
        <span style={{ display: "inline-block", width: "7px", height: "1em", background: "var(--primary)", animation: "blink 1s step-end infinite", verticalAlign: "text-bottom" }} />
      )}
    </div>
  )
}

export default function CEOPanel() {
  const audioRef = useRef<HTMLAudioElement>(null)

  const [transcribeState, setTranscribeState] = useState<TranscribeState>("idle")
  const [transcript,      setTranscript]      = useState("")
  const [transcriptDuration, setDuration]     = useState(0)

  const [articleState, setArticleState] = useState<ArticleState>("idle")
  const [article,      setArticle]      = useState("")

  const articleRef = useRef<HTMLDivElement>(null)

  async function runTranscribe() {
    setTranscribeState("loading")
    setTranscript("")
    try {
      const res  = await fetch("/api/transcribe", { method: "POST" })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTranscript(data.transcript)
      setDuration(data.duration ?? 0)
      setTranscribeState("done")
    } catch (e) {
      console.error(e)
      setTranscribeState("error")
    }
  }

  async function generateArticle() {
    setArticle("")
    setArticleState("loading")
    try {
      const res = await fetch("/api/ceoreport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })
      if (!res.body) throw new Error("No stream")
      setArticleState("streaming")
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const payload = line.slice(6).trim()
          if (payload === "[DONE]") { setArticleState("done"); break }
          try { setArticle(prev => prev + JSON.parse(payload).token) } catch { /* skip */ }
        }
      }
      setArticleState("done")
    } catch (e) {
      console.error(e)
      setArticleState("done")
    }
    setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div style={{ padding: "1.5rem", color: "var(--text)" }}>

      {/* ── Header banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #1a0a0a 0%, #0e1628 100%)",
        border: "1px solid var(--loss)",
        borderRadius: "12px",
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--loss)", marginBottom: "0.25rem" }}>
          🎙️ CEO Confession — Dr. Marcus Sterling, Neuro-Nectar
        </div>
        <div style={{ fontSize: "0.83rem", color: "#94a3b8" }}>
          ElevenLabs AI-generated interview · Transcribed live with{" "}
          <strong style={{ color: "var(--primary)" }}>Snowflake AI_TRANSCRIBE</strong>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>

        {/* ── Left: Audio + Transcribe ── */}
        <div style={{ background: "var(--surface, #0e1628)", border: "1px solid var(--border, #1e2d4a)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Step 1 — Listen
          </div>

          <audio ref={audioRef} controls style={{ width: "100%", borderRadius: "8px", marginBottom: "1rem" }}>
            <source src="/audio/ceo_interview_nrnt.mp3" type="audio/mpeg" />
          </audio>

          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Step 2 — Transcribe
          </div>

          <button
            onClick={runTranscribe}
            disabled={transcribeState === "loading"}
            style={{
              width: "100%",
              background: transcribeState === "done" ? "var(--surface-2, #131d35)" : "var(--loss)",
              border: `1px solid ${transcribeState === "done" ? "var(--border)" : "var(--loss)"}`,
              color: "#fff",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              cursor: transcribeState === "loading" ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              opacity: transcribeState === "loading" ? 0.7 : 1,
              marginBottom: "0.875rem",
            }}
          >
            {transcribeState === "loading" ? "⏳ Transcribing… (AI_TRANSCRIBE)" :
             transcribeState === "done"    ? `✅ Transcribed (${formatDuration(transcriptDuration)})` :
             transcribeState === "error"   ? "❌ Error — retry" :
             "🎙️ Transcribe with AI_TRANSCRIBE"}
          </button>

          {transcribeState === "loading" && (
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", textAlign: "center", padding: "0.5rem" }}>
              Running <code style={{ color: "var(--primary)" }}>AI_TRANSCRIBE</code> on staged MP3…
            </div>
          )}

          {transcript && (
            <div style={{
              background: "var(--surface-2, #131d35)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.75rem",
              maxHeight: "280px",
              overflowY: "auto",
              fontSize: "0.78rem",
              lineHeight: 1.65,
              color: "#cbd5e1",
            }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "var(--primary)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Transcript
              </div>
              {transcript}
            </div>
          )}
        </div>

        {/* ── Right: Evidence + Generate ── */}
        <div style={{ background: "var(--surface, #0e1628)", border: "1px solid var(--border, #1e2d4a)", borderRadius: "12px", padding: "1.25rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            Photographic Evidence
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "1rem" }}>
            {EVIDENCE_IMAGES.map(img => (
              <div key={img.filename} style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border)" }}>
                <img src={`/images/${img.filename}`} alt={img.label}
                  style={{ width: "100%", height: "80px", objectFit: "cover", display: "block" }} />
                <div style={{ padding: "3px 5px", fontSize: "0.65rem", color: "#64748b", background: "var(--surface-2, #131d35)" }}>
                  {img.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
            Step 3 — Generate Investigative Report
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748b", marginBottom: "0.75rem" }}>
            Combines CEO transcript · analyst reports · photographic evidence
          </div>

          <button
            onClick={generateArticle}
            disabled={transcribeState !== "done" || articleState === "loading" || articleState === "streaming"}
            style={{
              width: "100%",
              background: transcribeState !== "done" ? "var(--surface-2)" : "var(--primary)",
              border: "none",
              color: transcribeState !== "done" ? "#475569" : "#fff",
              padding: "0.6rem 1rem",
              borderRadius: "8px",
              cursor: (transcribeState !== "done" || articleState === "loading" || articleState === "streaming") ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              opacity: (articleState === "loading" || articleState === "streaming") ? 0.7 : 1,
            }}
          >
            {articleState === "loading" || articleState === "streaming"
              ? "⏳ Writing…"
              : transcribeState !== "done"
              ? "📰 Generate Report (transcribe first)"
              : articleState === "done" && article
              ? "↺ Regenerate Report"
              : "📰 Generate Investigative Report"}
          </button>

          {transcribeState !== "done" && (
            <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: "0.5rem", textAlign: "center" }}>
              Transcribe the interview first to unlock this
            </div>
          )}

          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
            {[
              { label: "AI_TRANSCRIBE", desc: "Audio → text" },
              { label: "Cortex Search", desc: "Analyst report context" },
              { label: "AI_COMPLETE",   desc: "Article generation" },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.72rem" }}>
                <span style={{ background: "rgba(41,181,232,0.12)", color: "var(--primary)", borderRadius: "4px", padding: "1px 6px", fontWeight: 600 }}>
                  {b.label}
                </span>
                <span style={{ color: "#475569" }}>{b.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Newspaper article ── */}
      {(article || articleState === "loading") && (
        <div
          ref={articleRef}
          style={{
            background: "var(--surface, #0e1628)",
            border: "1px solid var(--border, #1e2d4a)",
            borderRadius: "12px",
            padding: "2rem 2.25rem",
          }}
        >
          {articleState === "loading" && !article && (
            <div style={{ color: "#94a3b8", fontSize: "0.9rem", fontFamily: "Georgia, serif" }}>
              Journalist reviewing evidence…
            </div>
          )}

          {article && (
            <NewspaperArticle
              text={article}
              isStreaming={articleState === "streaming" || articleState === "loading"}
            />
          )}

          {articleState === "done" && article && (
            <div style={{ marginTop: "1.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)", fontSize: "0.7rem", color: "#475569", fontFamily: "sans-serif" }}>
              Generated using Snowflake Cortex AI_TRANSCRIBE · CORTEX.SEARCH_PREVIEW · AI_COMPLETE
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }`}</style>
    </div>
  )
}
