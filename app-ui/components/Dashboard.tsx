"use client"
import { useState } from "react"
import { MarketPanel } from "./MarketPanel"
import { EarningsPanel } from "./EarningsPanel"
import { AnalystPanel } from "./AnalystPanel"
import { SignalPanel } from "./SignalPanel"
import { CopilotPanel } from "./CopilotPanel"
import GalleryPanel from "./GalleryPanel"
import CEOPanel from "./CEOPanel"

const TABS = [
  { id: "market",   label: "Market Overview" },
  { id: "earnings", label: "Earnings Intelligence" },
  { id: "analyst",  label: "Analyst Research" },
  { id: "signals",  label: "NRNT Signals" },
  { id: "copilot",  label: "AI Copilot" },
  { id: "gallery",  label: "📸 NRNT Gallery" },
  { id: "ceo",      label: "🎙️ CEO Confession" },
]

export function Dashboard() {
  const [tab, setTab] = useState("market")

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">FSI <span>AI</span> Intelligence</div>
          <div className="header-badge">Powered by Snowflake Cortex</div>
        </div>
        <div className="header-right">
          <div className="ticker-chip">
            <span style={{ color: "var(--text-muted)", fontSize: ".72rem" }}>SNOW</span>
            <span className="gain">NYSE</span>
          </div>
          <div className="ticker-chip" style={{ borderColor: "rgba(239,68,68,.3)" }}>
            <span style={{ color: "var(--text-muted)", fontSize: ".72rem" }}>NRNT</span>
            <span className="loss">BANKRUPT</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="content">
        {tab === "market"   && <MarketPanel />}
        {tab === "earnings" && <EarningsPanel />}
        {tab === "analyst"  && <AnalystPanel />}
        {tab === "signals"  && <SignalPanel />}
        {tab === "copilot"  && <CopilotPanel />}
        {tab === "gallery"  && <GalleryPanel />}
        {tab === "ceo"      && <CEOPanel />}
      </div>
    </div>
  )
}
