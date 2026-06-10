"use client"
import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts"

type Row = Record<string, any>

const PLATFORM_COLORS: Record<string, string> = {
  Twitter: "#1DA1F2", Reddit: "#FF4500", LinkedIn: "#0077B5",
  Facebook: "#4267B2", Instagram: "#E1306C", WeChat: "#09B83E",
  Weibo: "#E6162D", "News Article": "#29b5e8",
}

export function SignalPanel() {
  const [data, setData]   = useState<any>({ trend: [], byPlatform: [], viral: [], emails: [], kpis: {} })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/social").then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false))
  }, [])

  const kpis = data.kpis as any
  const overallSent = parseFloat(kpis.OVERALL_SENTIMENT ?? 0)
  const sentColor = overallSent < 0.45 ? "var(--loss)" : overallSent > 0.6 ? "var(--gain)" : "var(--warning)"

  const trendChartData = (data.trend as Row[]).map(r => ({
    week: String(r.WEEK_START).slice(5, 10),
    posts: parseFloat(r.POSTS ?? 0),
    sentiment: (parseFloat(r.AVG_SENTIMENT ?? "0") * 100).toFixed(1),
    likes: parseFloat(r.TOTAL_LIKES ?? 0),
  }))

  const pieData = (data.byPlatform as Row[]).map(r => ({
    name: r.PLATFORM,
    value: parseFloat(r.POSTS ?? 0),
  }))

  if (loading) return <div className="loading">Loading NRNT signal intelligence…</div>

  return (
    <>
      {/* Alert */}
      <div className="nrnt-alert">
        <strong>⚠ NRNT (Neuro-Nectar) — Bankruptcy Case Study:</strong>{" "}
        Social media detected the collapse before it happened. Overall sentiment: {(overallSent * 100).toFixed(0)}% —
        declining week-over-week. Posts described a stock "down 60-64% from peak" months before bankruptcy filing.
        This tab shows how AI-powered social intelligence could have flagged the risk early.
      </div>

      {/* KPI row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 20 }}>
        <div className="kpi-card">
          <div className="kpi-label">Social Sentiment</div>
          <div className="kpi-value" style={{ color: sentColor }}>
            {(overallSent * 100).toFixed(0)}%
          </div>
          <div className="kpi-sub">avg across {parseFloat(kpis.TOTAL_POSTS ?? 0).toLocaleString()} posts</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Posts</div>
          <div className="kpi-value">{parseFloat(kpis.TOTAL_POSTS ?? 0).toLocaleString()}</div>
          <div className="kpi-sub">Aug–Dec 2024</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Likes</div>
          <div className="kpi-value">{parseFloat(kpis.TOTAL_LIKES ?? 0).toLocaleString()}</div>
          <div className="kpi-sub">cross-platform engagement</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Risk Signal</div>
          <div className="kpi-value loss">HIGH</div>
          <div className="kpi-sub">declining trend + bankruptcy</div>
        </div>
      </div>

      <div className="charts-2col">
        {/* Sentiment trend */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">NRNT Social Sentiment Trend — Weekly</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} domain={[0, 100]} stroke="var(--border)" />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                  formatter={(v: any) => [`${v}%`, "Sentiment"]} />
                <Area type="monotone" dataKey="sentiment" stroke="#ef4444" strokeWidth={2}
                  fill="url(#sentGrad)" dot={{ r: 3, fill: "#ef4444" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Post volume + platform pie */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Platform Distribution</span>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {pieData.map((p, i) => (
                    <Cell key={i} fill={PLATFORM_COLORS[p.name] ?? "#29b5e8"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                  formatter={(v: any, n: string) => [`${v} posts`, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Weekly post volume */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">NRNT Weekly Post Volume</span>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={trendChartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 9 }} stroke="var(--border)" />
              <YAxis tick={{ fontSize: 9 }} stroke="var(--border)" />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                formatter={(v: any) => [`${v} posts`, "Volume"]} />
              <Bar dataKey="posts" radius={[2,2,0,0]}>
                {trendChartData.map((r, i) => (
                  <Cell key={i} fill={parseFloat(r.sentiment) < 40 ? "#ef4444" : parseFloat(r.sentiment) < 55 ? "#f59e0b" : "#10b981"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Most viral posts */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Most Viral NRNT Posts — Early Warning Signals</span>
        </div>
        <div className="card-body" style={{ maxHeight: 340, overflowY: "auto" }}>
          {(data.viral as Row[]).map((p, i) => {
            const sent = parseFloat(p.SENTIMENT_SCORE ?? 0)
            return (
              <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: ".72rem", fontWeight: 700, color: PLATFORM_COLORS[p.PLATFORM] ?? "var(--primary)" }}>
                    {p.PLATFORM}
                  </span>
                  <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>@{p.AUTHOR_HANDLE}</span>
                  <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>
                    {String(p.TIMESTAMP).slice(0, 10)}
                  </span>
                  <span style={{ fontSize: ".72rem", marginLeft: "auto",
                    color: sent < 0.45 ? "var(--loss)" : sent > 0.6 ? "var(--gain)" : "var(--warning)" }}>
                    sentiment: {(sent * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ fontSize: ".82rem", lineHeight: 1.6, color: "var(--text)" }}>"{p.TEXT}"</div>
                <div style={{ display: "flex", gap: 14, marginTop: 5, fontSize: ".72rem", color: "var(--text-muted)" }}>
                  <span>❤ {parseFloat(p.LIKES ?? 0).toLocaleString()}</span>
                  <span>🔁 {parseFloat(p.RETWEETS ?? 0).toLocaleString()}</span>
                  <span>💬 {parseFloat(p.REPLIES ?? 0).toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Emails */}
      {data.emails?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">FSI Email Intelligence</span>
            <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>Recent emails from corpus</span>
          </div>
          <div className="card-body">
            <table className="data-table">
              <thead><tr><th>Subject</th><th>Date</th></tr></thead>
              <tbody>
                {(data.emails as Row[]).map((e, i) => (
                  <tr key={i}>
                    <td>{e.SUBJECT}</td>
                    <td style={{ color: "var(--text-muted)", fontSize: ".78rem" }}>
                      {String(e.CREATED_AT).slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
