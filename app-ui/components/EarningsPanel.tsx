"use client"
import { useEffect, useState } from "react"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend } from "recharts"

type Row = Record<string, any>

const CALL_LABELS: Record<string, string> = {
  "EARNINGS_Q1_FY2025.mp3": "Q1 FY2025",
  "EARNINGS_Q2_FY2025.mp3": "Q2 FY2025",
  "EARNINGS_Q3_FY2025.mp3": "Q3 FY2025",
}

export function EarningsPanel() {
  const [data, setData]       = useState<{ callSentiment: Row[], segments: Row[] }>({ callSentiment: [], segments: [] })
  const [selectedCall, setSelectedCall] = useState<string>("")
  const [query, setQuery]     = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/sentiment").then(r => r.json()).then(d => {
      setData(d)
      if (d.callSentiment?.length) setSelectedCall(d.callSentiment[d.callSentiment.length - 1]?.RELATIVE_PATH)
    }).finally(() => setLoading(false))
  }, [])

  const call = data.callSentiment.find(c => c.RELATIVE_PATH === selectedCall)

  const radarData = call ? [
    { dim: "Innovation",   value: parseFloat(call.INNOV_POSITIVE_PCT ?? 0) },
    { dim: "Productivity", value: parseFloat(call.PROD_POSITIVE_PCT ?? 0) },
    { dim: "Cost Mgmt",   value: parseFloat(call.COST_POSITIVE_PCT ?? 0) },
    { dim: "Competition",  value: parseFloat(call.COMP_POSITIVE_PCT ?? 0) },
    { dim: "Consumption",  value: parseFloat(call.CONS_POSITIVE_PCT ?? 0) },
  ] : []

  const trendData = data.callSentiment.map(c => ({
    call: CALL_LABELS[c.RELATIVE_PATH] ?? c.RELATIVE_PATH,
    positive: parseFloat(c.POSITIVE_PCT ?? 0),
    negative: parseFloat(c.NEGATIVE_PCT ?? 0),
    score: parseFloat(c.OVERALL_SCORE ?? 0),
  }))

  const callSegments = data.segments.filter(s => s.RELATIVE_PATH === selectedCall)

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const r = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, service: "earnings" }) })
      const d = await r.json()
      setResults(d.results ?? [])
    } finally { setSearching(false) }
  }

  if (loading) return <div className="loading">Loading earnings intelligence…</div>

  return (
    <>
      {/* Call selector */}
      <div className="filter-row">
        <span style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>Earnings call:</span>
        {data.callSentiment.map(c => (
          <button key={c.RELATIVE_PATH}
            onClick={() => setSelectedCall(c.RELATIVE_PATH)}
            style={{
              padding: "5px 14px", borderRadius: 20, cursor: "pointer", fontSize: ".78rem", fontWeight: 600,
              background: selectedCall === c.RELATIVE_PATH ? "var(--primary)" : "var(--surface-2)",
              color: selectedCall === c.RELATIVE_PATH ? "#fff" : "var(--text-muted)",
              border: `1px solid ${selectedCall === c.RELATIVE_PATH ? "var(--primary)" : "var(--border)"}`,
            }}>
            {CALL_LABELS[c.RELATIVE_PATH] ?? c.RELATIVE_PATH}
          </button>
        ))}
      </div>

      {/* KPIs for selected call */}
      {call && (
        <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-label">Overall Score</div>
            <div className={`kpi-value ${parseFloat(call.OVERALL_SCORE) > 0 ? "gain" : "loss"}`}>
              {parseFloat(call.OVERALL_SCORE) > 0 ? "+" : ""}{parseFloat(call.OVERALL_SCORE).toFixed(2)}
            </div>
            <div className="kpi-sub">-1 very negative → +1 very positive</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Positive Segments</div>
            <div className="kpi-value gain">{call.POSITIVE_PCT}%</div>
            <div className="kpi-sub">of {call.SEGMENTS} transcript segments</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Negative Segments</div>
            <div className="kpi-value loss">{call.NEGATIVE_PCT}%</div>
            <div className="kpi-sub">concern / caution signals</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Innovation Signal</div>
            <div className="kpi-value" style={{ color: "var(--primary)" }}>{call.INNOV_POSITIVE_PCT}%</div>
            <div className="kpi-sub">positive innovation mentions</div>
          </div>
        </div>
      )}

      <div className="charts-2col">
        {/* Radar chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sentiment Dimensions — {CALL_LABELS[selectedCall] ?? selectedCall}</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "var(--text-muted)" }} tickFormatter={v => `${v}%`} />
                <Radar dataKey="value" stroke="#29b5e8" fill="#29b5e8" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip formatter={(v: any) => [`${v}%`, "Positive mentions"]}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend across calls */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Sentiment Trend — Q1 → Q3 FY2025</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={trendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="call" tick={{ fontSize: 11 }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} stroke="var(--border)" />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                  formatter={(v: any, n: string) => [`${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="positive" name="Positive %" fill="var(--gain)" radius={[3,3,0,0]} opacity={.8} />
                <Bar dataKey="negative" name="Negative %" fill="var(--loss)" radius={[3,3,0,0]} opacity={.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cortex Search */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Search Earnings Call Transcripts — Cortex Search</span>
          <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>SNOW_FULL_EARNINGS_CALLS</span>
        </div>
        <div className="card-body">
          <div className="search-box">
            <input className="search-input" value={query} onChange={e => setQuery(e.target.value)}
              placeholder="e.g. product margin, AI revenue, guidance…"
              onKeyDown={e => e.key === "Enter" && search()} />
            <button className="search-btn" onClick={search} disabled={searching}>
              {searching ? "Searching…" : "Search"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {["AI product revenue", "margin expansion", "customer growth", "competition risk"].map(q => (
              <button key={q} className="chat-suggest-btn" onClick={() => { setQuery(q); search() }}>{q}</button>
            ))}
          </div>
          {results.map((r, i) => (
            <div key={i} className="search-result">
              <div className="search-result-meta">{r.FILE_PATH ?? r.RELATIVE_PATH ?? `Result ${i+1}`}</div>
              <div className="search-result-text">{r.TEXT ?? r.CHUNK ?? JSON.stringify(r)}</div>
            </div>
          ))}
          {results.length === 0 && query && !searching && (
            <div style={{ color: "var(--text-muted)", fontSize: ".82rem" }}>No results yet — press Search.</div>
          )}
        </div>
      </div>

      {/* Sample segments */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Transcript Excerpts — {CALL_LABELS[selectedCall]}</span>
        </div>
        <div className="card-body" style={{ maxHeight: 300, overflowY: "auto" }}>
          {callSegments.slice(0, 8).map((s, i) => (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "center" }}>
                <span className={`sent-${s.OVERALL_SENTIMENT}`} style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase" }}>
                  {s.OVERALL_SENTIMENT}
                </span>
              </div>
              <div style={{ fontSize: ".81rem", lineHeight: 1.6, color: "var(--text-muted)" }}>
                "{s.EXCERPT}"
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
