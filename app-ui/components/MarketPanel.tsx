"use client"
import { useEffect, useState } from "react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from "recharts"

type Row = Record<string, any>

export function MarketPanel() {
  const [snowData, setSnowData] = useState<Row[]>([])
  const [snowKpis, setSnowKpis] = useState<any>({})
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/market?ticker=SNOW&days=90").then(r => r.json()),
    ]).then(([snow]) => {
      setSnowData(snow.prices ?? [])
      setSnowKpis(snow.kpis ?? {})
    }).finally(() => setLoading(false))
  }, [])

  const chartData = snowData
    .filter(r => r.CLOSE || r.HIGH)
    .map(r => ({
      date: String(r.DATE).slice(5),      // MM-DD
      price: parseFloat(r.CLOSE ?? r.HIGH ?? 0),
      high:  parseFloat(r.HIGH  ?? 0),
      low:   parseFloat(r.LOW   ?? 0),
      vol:   parseFloat(r.VOLUME ?? 0) / 1_000_000, // millions
    }))

  const price    = parseFloat(snowKpis.price ?? 0)
  const changePct = parseFloat(snowKpis.changePct ?? 0)
  const change    = parseFloat(snowKpis.change ?? 0)

  return (
    <>
      {/* KPI Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi-card">
          <div className="kpi-label">SNOW Price</div>
          <div className={`kpi-value ${changePct >= 0 ? "gain" : "loss"}`}>
            ${price.toFixed(2)}
          </div>
          <div className="kpi-sub">{changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}% day</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Day Change</div>
          <div className={`kpi-value ${change >= 0 ? "gain" : "loss"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(2)}
          </div>
          <div className="kpi-sub">vs. prior close</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Exchange</div>
          <div className="kpi-value" style={{ fontSize: "1.1rem" }}>NYSE</div>
          <div className="kpi-sub">Snowflake Inc.</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">NRNT Status</div>
          <div className="kpi-value loss" style={{ fontSize: "1.1rem" }}>BANKRUPT</div>
          <div className="kpi-sub">Neuro-Nectar Inc.</div>
        </div>
      </div>

      {loading ? <div className="loading">Loading SNOW market data…</div> : (
        <>
          {/* Price chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">SNOW — 90-Day Price History (NYSE)</span>
              <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>
                All-day high/close · Source: ACCELERATE_AI_IN_FSI
              </span>
            </div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="snowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#29b5e8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#29b5e8" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={13} stroke="var(--border)" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}`} domain={["auto","auto"]} stroke="var(--border)" />
                  <Tooltip
                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                    labelStyle={{ color: "var(--text-muted)", fontSize: 11 }}
                    formatter={(v: any) => [`$${parseFloat(v).toFixed(2)}`, "Price"]}
                  />
                  <Area type="monotone" dataKey="price" stroke="#29b5e8" strokeWidth={2}
                    fill="url(#snowGrad)" dot={false} name="SNOW" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NRNT disclaimer */}
          <div className="nrnt-alert">
            <strong>⚠ NRNT (Neuro-Nectar) — Fictional Case Study:</strong> This nootropic "magic ice cream" startup had 4,391 social media posts
            from Aug–Dec 2024, peak sentiment 0.73 → collapsing to 0.35. Stock fell 64% before bankruptcy filing.
            The Signal Intelligence tab shows how AI could have detected the collapse early.
          </div>

          {/* Volume bars if available */}
          {chartData.some(r => r.vol > 0) && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">SNOW — Trading Volume (Millions)</span>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={chartData.filter(r => r.vol > 0)} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={8} stroke="var(--border)" />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v}M`} stroke="var(--border)" />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6 }}
                      formatter={(v: any) => [`${parseFloat(v).toFixed(1)}M`, "Volume"]}
                    />
                    <Bar dataKey="vol" radius={[2,2,0,0]}>
                      {chartData.filter(r => r.vol > 0).map((r, i) => (
                        <Cell key={i} fill={r.vol > 1 ? "#29b5e8" : "#1e2d4a"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}
