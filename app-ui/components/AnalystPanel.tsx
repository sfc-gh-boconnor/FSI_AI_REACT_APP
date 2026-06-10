"use client"
import { useEffect, useState } from "react"

type Row = Record<string, any>

export function AnalystPanel() {
  const [reports, setReports]   = useState<Row[]>([])
  const [query, setQuery]       = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults]   = useState<any[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch("/api/reports").then(r => r.json()).then(d => setReports(d.rows ?? [])).finally(() => setLoading(false))
  }, [])

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, service: "reports" }),
      })
      const d = await r.json()
      setResults(d.results ?? [])
    } finally { setSearching(false) }
  }

  const ratingClass = (r: string | null) => {
    if (!r) return ""
    const u = r.toUpperCase()
    if (u.includes("BUY") || u.includes("OUTPERFORM") || u.includes("STRONG")) return "buy"
    if (u.includes("SELL") || u.includes("UNDERPERFORM")) return "sell"
    return "hold"
  }

  return (
    <>
      {/* Cortex Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Search Analyst Reports — Cortex AI</span>
          <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>ANALYST_REPORTS_SEARCH</span>
        </div>
        <div className="card-body">
          <div className="search-box">
            <input className="search-input" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="e.g. price target, growth outlook, AI platform revenue…"
              onKeyDown={e => e.key === "Enter" && search()} />
            <button className="search-btn" onClick={search} disabled={searching}>
              {searching ? "Searching…" : "Search Reports"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {["price target upgrade", "AI revenue growth", "competitive moat", "cloud migration"].map(q => (
              <button key={q} className="chat-suggest-btn" onClick={() => { setQuery(q); search() }}>{q}</button>
            ))}
          </div>
          {results.map((r, i) => (
            <div key={i} className="search-result">
              <div className="search-result-meta">
                {r.NAME_OF_REPORT_PROVIDER ?? r.FILE_PATH ?? `Result ${i + 1}`}
              </div>
              <div className="search-result-text">{r.SUMMARY ?? r.TEXT ?? r.FULL_TEXT ?? JSON.stringify(r)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Report cards */}
      {loading ? (
        <div className="loading">Loading analyst reports…</div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <span className="card-title">{reports.length} Analyst Reports — Snowflake (SNOW)</span>
          </div>
          {reports.map((r, i) => (
            <div key={i} className="report-card">
              <div className="report-header">
                <div>
                  <div className="report-provider">{r.NAME_OF_REPORT_PROVIDER ?? "Unknown Provider"}</div>
                  <div className="report-date">{r.DATE_REPORT ? String(r.DATE_REPORT).slice(0, 10) : "N/A"}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {r.RATING && (
                    <span className={`report-rating ${ratingClass(r.RATING)}`}>{r.RATING}</span>
                  )}
                  {r.DOCUMENT_TYPE && (
                    <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{r.DOCUMENT_TYPE}</span>
                  )}
                </div>
              </div>
              <div className="report-targets">
                {r.CLOSE_PRICE && <span>Close: <strong>${parseFloat(r.CLOSE_PRICE).toFixed(2)}</strong></span>}
                {r.PRICE_TARGET && <span>Target: <strong style={{ color: "var(--primary)" }}>${parseFloat(r.PRICE_TARGET).toFixed(2)}</strong></span>}
                {r.GROWTH && <span>Growth: <strong className={parseFloat(r.GROWTH) >= 0 ? "gain" : "loss"}>
                  {parseFloat(r.GROWTH) >= 0 ? "+" : ""}{parseFloat(r.GROWTH).toFixed(1)}%
                </strong></span>}
              </div>
              {r.SUMMARY && (
                <div className="report-summary" style={{ marginTop: 10 }}>{r.SUMMARY}</div>
              )}
            </div>
          ))}
        </>
      )}
    </>
  )
}
