"use client"
import { useEffect, useState, useRef } from "react"

interface Post {
  platform: string
  author: string
  text: string
  sentiment: number
  likes: number
  retweets: number
}

interface ImageItem {
  filename: string
  posts: Post[]
  caption?: string
  captionLoading?: boolean
}

const FRIENDLY_NAMES: Record<string, string> = {
  "ceo_neuro_nectar_leaving_office_gone_bust.png": "CEO's Hasty Exit",
  "chinese_man_not_happy_angry_icecream.png": "The Betrayed Investor",
  "dev_team_icecream.png": "Dev Team Productivity Hack",
  "eating_icecream.png": "True Believer",
  "icecream_brainfog_gone.png": "Before & After (Mostly After)",
  "icecream_in_landfill_recall.png": "The Great Recall",
  "neuro_icecream.png": "The Product That Started It All",
}

export default function GalleryPanel() {
  const [images, setImages] = useState<ImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [article, setArticle] = useState("")
  const [articleLoading, setArticleLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null)
  const articleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/gallery")
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setImages(data.images.map((img: ImageItem) => ({ ...img, caption: undefined, captionLoading: false })))
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function generateCaption(idx: number) {
    const img = images[idx]
    setImages(prev => prev.map((item, i) => i === idx ? { ...item, captionLoading: true } : item))
    try {
      const res = await fetch("/api/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: img.filename, posts: img.posts }),
      })
      const data = await res.json()
      setImages(prev => prev.map((item, i) => i === idx ? { ...item, caption: data.caption, captionLoading: false } : item))
    } catch {
      setImages(prev => prev.map((item, i) => i === idx ? { ...item, caption: "Caption failed — the AI is probably in shock too.", captionLoading: false } : item))
    }
  }

  async function generateAllCaptions() {
    for (let i = 0; i < images.length; i++) {
      if (!images[i].caption) await generateCaption(i)
    }
  }

  async function generateNewsArticle() {
    setArticle("")
    setArticleLoading(true)
    const allPosts = images.flatMap(img => img.posts)
    try {
      const res = await fetch("/api/newsarticle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: allPosts }),
      })
      if (!res.body) throw new Error("No stream")
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const payload = line.slice(6).trim()
            if (payload === "[DONE]") { setArticleLoading(false); break }
            try {
              const { token } = JSON.parse(payload)
              setArticle(prev => prev + token)
            } catch { /* skip */ }
          }
        }
      }
    } catch (e) {
      setArticle("Failed to generate article. The story dies untold.")
    } finally {
      setArticleLoading(false)
    }
    setTimeout(() => articleRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  function renderMarkdown(text: string) {
    return text
      .replace(/^## (.+)$/gm, '<h2 style="color:var(--primary);font-size:1.3rem;margin:1rem 0 0.5rem">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="color:var(--text);font-size:1.1rem;margin:0.8rem 0 0.3rem">$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p style="margin:0.6rem 0">')
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--text-muted, #94a3b8)" }}>
      Loading NRNT image archive...
    </div>
  )

  if (error) return (
    <div style={{ padding: "2rem", color: "var(--loss)", textAlign: "center" }}>
      Failed to load gallery: {error}
    </div>
  )

  return (
    <div style={{ padding: "1.5rem", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #0e1628 100%)",
          border: "1px solid var(--loss)",
          borderRadius: "12px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}>
          <div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--loss)" }}>
              📸 NRNT Post-Mortem Photo Archive
            </div>
            <div style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.25rem" }}>
              7 images documenting the rise and spectacular fall of Neuro-Nectar ($NRNT)
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={generateAllCaptions}
              style={{
                background: "var(--surface-2, #131d35)",
                border: "1px solid var(--primary)",
                color: "var(--primary)",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              ✨ Caption All Images
            </button>
            <button
              onClick={generateNewsArticle}
              disabled={articleLoading}
              style={{
                background: articleLoading ? "var(--surface-2, #131d35)" : "var(--loss)",
                border: "none",
                color: "#fff",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                cursor: articleLoading ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                fontWeight: 600,
                opacity: articleLoading ? 0.7 : 1,
              }}
            >
              {articleLoading ? "⏳ Writing Article..." : "📰 Generate News Article"}
            </button>
          </div>
        </div>
      </div>

      {/* Image Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2rem",
      }}>
        {images.map((img, idx) => (
          <div
            key={img.filename}
            style={{
              background: "var(--surface, #0e1628)",
              border: "1px solid var(--border, #1e2d4a)",
              borderRadius: "12px",
              overflow: "hidden",
              transition: "border-color 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--primary)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border, #1e2d4a)")}
          >
            {/* Image */}
            <div
              style={{ position: "relative", overflow: "hidden", height: "200px", background: "#0a0f1e" }}
              onClick={() => setSelectedImage(img)}
            >
              <img
                src={`/images/${img.filename}`}
                alt={FRIENDLY_NAMES[img.filename] ?? img.filename}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              <div style={{
                position: "absolute", top: "0.5rem", right: "0.5rem",
                background: "rgba(0,0,0,0.7)", borderRadius: "6px", padding: "2px 8px",
                fontSize: "0.7rem", color: "#94a3b8",
              }}>
                {img.posts.length} post{img.posts.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: "0.875rem" }}>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.5rem", color: "var(--text)" }}>
                {FRIENDLY_NAMES[img.filename] ?? img.filename}
              </div>

              {/* Top post */}
              {img.posts[0] && (
                <div style={{
                  background: "var(--surface-2, #131d35)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.625rem",
                  marginBottom: "0.75rem",
                  fontSize: "0.775rem",
                  color: "#94a3b8",
                  borderLeft: "3px solid var(--primary)",
                }}>
                  <span style={{ color: "var(--primary)", fontWeight: 600 }}>@{img.posts[0].author}</span>
                  {" "}&mdash; &ldquo;{img.posts[0].text.slice(0, 100)}{img.posts[0].text.length > 100 ? "…" : ""}&rdquo;
                </div>
              )}

              {/* Caption area */}
              {img.caption ? (
                <div style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: "6px",
                  padding: "0.5rem 0.625rem",
                  fontSize: "0.8rem",
                  color: "#fca5a5",
                  fontStyle: "italic",
                  marginBottom: "0.5rem",
                }}>
                  🤖 {img.caption}
                </div>
              ) : null}

              <button
                onClick={() => generateCaption(idx)}
                disabled={img.captionLoading}
                style={{
                  width: "100%",
                  background: "var(--surface-2, #131d35)",
                  border: `1px solid ${img.caption ? "var(--border, #1e2d4a)" : "var(--primary)"}`,
                  color: img.caption ? "#94a3b8" : "var(--primary)",
                  padding: "0.375rem",
                  borderRadius: "6px",
                  cursor: img.captionLoading ? "not-allowed" : "pointer",
                  fontSize: "0.775rem",
                  fontWeight: 600,
                  opacity: img.captionLoading ? 0.6 : 1,
                }}
              >
                {img.captionLoading ? "Generating…" : img.caption ? "↺ Regenerate Caption" : "✨ Generate Caption"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* News Article */}
      {(article || articleLoading) && (
        <div ref={articleRef} style={{
          background: "var(--surface, #0e1628)",
          border: "1px solid var(--border, #1e2d4a)",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", letterSpacing: "0.1em", marginBottom: "1rem", textTransform: "uppercase" }}>
            📰 The Financial Farce — Breaking News
          </div>
          {articleLoading && !article && (
            <div style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Journalist is furiously typing…</div>
          )}
          <div
            style={{ lineHeight: 1.7, fontSize: "0.9rem", color: "var(--text)" }}
            dangerouslySetInnerHTML={{ __html: `<p style="margin:0.6rem 0">${renderMarkdown(article)}</p>` }}
          />
          {articleLoading && (
            <span style={{ display: "inline-block", width: "8px", height: "1em", background: "var(--primary)", animation: "blink 1s step-end infinite", verticalAlign: "text-bottom", marginLeft: "2px" }} />
          )}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "2rem",
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: "800px", width: "100%", background: "var(--surface, #0e1628)", borderRadius: "16px", overflow: "hidden" }}
          >
            <img
              src={`/images/${selectedImage.filename}`}
              alt={FRIENDLY_NAMES[selectedImage.filename] ?? selectedImage.filename}
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", background: "#0a0f1e" }}
            />
            <div style={{ padding: "1rem 1.25rem" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem" }}>
                {FRIENDLY_NAMES[selectedImage.filename]}
              </div>
              {selectedImage.caption && (
                <div style={{ color: "#fca5a5", fontStyle: "italic", fontSize: "0.875rem" }}>
                  🤖 {selectedImage.caption}
                </div>
              )}
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.5rem" }}>
                Click outside to close
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
      `}</style>
    </div>
  )
}
