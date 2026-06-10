---
name: fsi-deploy
description: "Deploy, develop, and extend the FSI AI Intelligence platform — an investment intelligence app using the ACCELERATE_AI_IN_FSI database. Covers SNOW earnings intelligence, NRNT social signal analysis, analyst reports, AI Copilot chat, and Cortex Search. Built on Snowflake App Runtime (Next.js). Triggers: deploy FSI app, build FSI intelligence, FSI demo, SNOW earnings, NRNT bankruptcy signals, social sentiment app, financial intelligence platform, fsi-deploy."
---

# FSI AI Intelligence Platform — Dev & Deploy Skill

Builds, deploys, and extends the **FSI AI Intelligence** Next.js app on **Snowflake App Runtime** (`snow app deploy`). No Docker, no containers — source code is uploaded to a Snowflake stage and built in SPCS.

---

## Project Overview

**Two-ticker narrative:**
- **SNOW (NYSE)** — Snowflake Inc. earnings calls Q1–Q3 FY2025, 30 analyst reports, stock price history
- **NRNT (BANKRUPT)** — Fictional Neuro-Nectar "magic nootropic icecream" startup, 4,391 social media posts tracking its collapse

**Story:** Show how AI-powered intelligence could detect NRNT's bankruptcy before it happened via declining social sentiment (0.73 → 0.35), while SNOW's Q3 FY2025 shows 79% positive sentiment.

---

## Account & Connection

```
Connection:  fsi-builders-london
Account:     SFSEHOL-FSI_BUILDERS_WORKSHOP_LONDON_IFAJAJ
Database:    ACCELERATE_AI_IN_FSI
Schema:      DEFAULT_SCHEMA
Warehouse:   DEFAULT_WH
```

Test connection:
```bash
snow sql -c fsi-builders-london -q "SELECT CURRENT_ACCOUNT(), CURRENT_ROLE()"
```

---

## Repository

```
/Users/beckyoconnor/lab_projects/FSI_AI_REACT_APP/
├── app-ui/
│   ├── app/
│   │   ├── api/
│   │   │   ├── market/route.ts       SNOW OHLCV from STOCK_PRICE_TIMESERIES (long→pivot)
│   │   │   ├── sentiment/route.ts    Q1/Q2/Q3 FY2025 earnings call sentiment aggregation
│   │   │   ├── reports/route.ts      30 analyst reports from ANALYST_REPORTS
│   │   │   ├── social/route.ts       NRNT social media: trend, platform, viral posts, emails
│   │   │   ├── search/route.ts       CORTEX.SEARCH_PREVIEW (POST) — multi-service search
│   │   │   └── chat/route.ts         AI_COMPLETE SSE streaming chat
│   │   ├── globals.css               Dark navy theme (--bg:#0a0f1e, --primary:#29b5e8)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── Dashboard.tsx             5-tab shell + header with SNOW/NRNT ticker chips
│   │   ├── MarketPanel.tsx           SNOW 90-day chart + KPIs + NRNT warning banner
│   │   ├── EarningsPanel.tsx         Sentiment radar (5 dims), Q1→Q3 bar chart, transcript search
│   │   ├── AnalystPanel.tsx          30 analyst report cards + Cortex Search
│   │   ├── SignalPanel.tsx           NRNT: sentiment trend, platform pie, viral posts, emails
│   │   └── CopilotPanel.tsx          SSE streaming chat with 6 FSI suggestions
│   ├── lib/snowflake.ts              Snowflake connection helper (SPCS token + TOML auth)
│   ├── snowflake.yml                 App Runtime config — ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA
│   └── app.yml                       Build commands (npm ci + node .next/standalone/server.js)
└── .cortex/skills/fsi-deploy/SKILL.md
```

---

## Data Model

### SNOW Data (Real)

| Table / View | Rows | Description |
|---|---|---|
| `STOCK_PRICES` | 341M | Raw tick data — all tickers |
| `STOCK_PRICE_TIMESERIES` | view | Long-format: TICKER, VARIABLE, DATE, VALUE — must be pivoted |
| `AI_SENTIMENT_RESULTS` | 317 | Earnings call segments with 5 sentiment dimensions |
| `ANALYST_REPORTS` | 30 | Analyst reports: RATING, PRICE_TARGET, GROWTH, SUMMARY |

**Stock price pivot pattern** (STOCK_PRICE_TIMESERIES is long-format):
```sql
SELECT DATE,
  MAX(CASE WHEN VARIABLE='all-day_high' THEN VALUE END)      AS HIGH,
  MAX(CASE WHEN VARIABLE='all-day_low'  THEN VALUE END)      AS LOW,
  MAX(CASE WHEN VARIABLE='pre-market_open' THEN VALUE END)   AS OPEN,
  MAX(CASE WHEN VARIABLE='post-market_close' THEN VALUE END) AS CLOSE,
  MAX(CASE WHEN VARIABLE='nasdaq_volume' THEN VALUE END)     AS VOLUME
FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.STOCK_PRICE_TIMESERIES
WHERE TICKER = 'SNOW'
GROUP BY DATE
HAVING HIGH IS NOT NULL OR CLOSE IS NOT NULL
ORDER BY DATE DESC LIMIT 90
```

**Earnings call sentiment table columns:**
- `RELATIVE_PATH` — `EARNINGS_Q1_FY2025.mp3` / `Q2` / `Q3`
- `TEXT` — transcript segment
- `OVERALL_SENTIMENT` — `positive` / `negative` / `neutral`
- `COST_SENTIMENT`, `INNOVATION_SENTIMENT`, `PRODUCTIVITY_SENTIMENT`, `COMPETITIVENESS_SENTIMENT`, `CONSUMPTION_SENTIMENT`

### NRNT Data (Fictional)

| Table | Rows | Description |
|---|---|---|
| `SOCIAL_MEDIA_NRNT` | 4,391 | Posts Aug–Dec 2024; SENTIMENT as FLOAT 0–1, avg ~0.37 |
| `EMAIL_PREVIEWS` | 327 | Email subjects + dates |

**SOCIAL_MEDIA_NRNT columns:** TIMESTAMP, PLATFORM, AUTHOR_HANDLE, TEXT, SENTIMENT (FLOAT), LIKES, RETWEETS, REPLIES

**Sentiment significance:** <0.45 = bearish, 0.45–0.6 = neutral, >0.6 = bullish. NRNT peaked at ~0.73 then collapsed to 0.35.

### Cortex Search Services

| Service | Content |
|---|---|
| `ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SNOW_FULL_EARNINGS_CALLS` | Full earnings call transcripts |
| `ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.ANALYST_REPORTS_SEARCH` | Analyst report text |
| `ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.DOW_ANALYSTS_SENTIMENT_ANALYSIS` | Analyst sentiment |
| `ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.EMAILS` | Email content |

**Search pattern:**
```sql
SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
  'ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SNOW_FULL_EARNINGS_CALLS',
  'AI revenue growth',
  OBJECT_CONSTRUCT('limit', 5)
) AS RESULTS
```

### Semantic Views / Cortex Analyst

| View | Purpose |
|---|---|
| `ACCELERATE_AI_IN_FSI.CORTEX_ANALYST.COMPANY_DATA_8_CORE_FEATURED_TICKERS` | Multi-ticker company data |
| `ACCELERATE_AI_IN_FSI.CORTEX_ANALYST.SNOWFLAKE_ANALYSTS_VIEW` | Analyst-focused view |
| `ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.FSI_ANALYSIS` | General FSI analysis view |

### Cortex Agents

- `SNOWFLAKE_INTELLIGENCE.AGENTS.FSI_INTELLIGENCE` — Full FSI intelligence agent
- `SNOWFLAKE_INTELLIGENCE.AGENTS.One Ticker` — Single-ticker analysis

---

## App Tabs

| Tab | Component | Data Sources |
|-----|-----------|-------------|
| **Market Overview** | `MarketPanel.tsx` | `STOCK_PRICE_TIMESERIES` pivot + KPIs |
| **Earnings Intelligence** | `EarningsPanel.tsx` | `AI_SENTIMENT_RESULTS` + `SNOW_FULL_EARNINGS_CALLS` search |
| **Analyst Research** | `AnalystPanel.tsx` | `ANALYST_REPORTS` + `ANALYST_REPORTS_SEARCH` |
| **NRNT Signals** | `SignalPanel.tsx` | `SOCIAL_MEDIA_NRNT` + `EMAIL_PREVIEWS` |
| **AI Copilot** | `CopilotPanel.tsx` | `AI_COMPLETE('claude-sonnet-4-5', ...)` → SSE stream |

---

## Deploy

### First-time deploy (new account)

```bash
# 1. Check snowflake.yml is configured for the right account
cat /Users/beckyoconnor/lab_projects/FSI_AI_REACT_APP/app-ui/snowflake.yml

# 2. Run setup SQL to create any required objects (if needed)
# Note: ACCELERATE_AI_IN_FSI database and all tables already exist on fsi-builders-london
# No SQL setup scripts are required — the data is pre-loaded

# 3. Deploy
cd /Users/beckyoconnor/lab_projects/FSI_AI_REACT_APP/app-ui
snow app deploy -c fsi-builders-london
```

### Re-deploy after code changes

```bash
cd /Users/beckyoconnor/lab_projects/FSI_AI_REACT_APP/app-ui
snow app deploy -c fsi-builders-london
```

**Upgrade is fast (~2–3 min)** since the Docker image is already cached. Only changed source files are re-uploaded.

### Get the URL

```bash
snow app open -c fsi-builders-london --print-only
```

Or check Snowsight → Apps → FSI_AI_REACT_APP.

**Current URL:** `https://astf2ob-sfsehol-fsi-builders-workshop-london-ifajaj.snowflakecomputing.app`

---

## Adding a New Tab

1. **Create the API route** in `app-ui/app/api/<name>/route.ts`:
   - Import `querySnowflake` from `@/lib/snowflake`
   - Query `ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.<TABLE>`
   - Return `Response.json({ ... })`

2. **Create the component** in `app-ui/components/<Name>Panel.tsx`:
   - `"use client"` directive at top
   - `useEffect` fetching `/api/<name>` on mount
   - Use Recharts (`AreaChart`, `BarChart`, `PieChart`, `RadarChart`) for visualisations
   - Apply CSS classes from `globals.css`: `.card`, `.kpi-card`, `.data-table`, etc.

3. **Register the tab** in `Dashboard.tsx`:
   - Add entry to `TABS` array: `{ id: "name", label: "Display Name" }`
   - Add `{tab === "name" && <NamePanel />}` to the content section

4. **Deploy:**
   ```bash
   cd /Users/beckyoconnor/lab_projects/FSI_AI_REACT_APP/app-ui
   snow app deploy -c fsi-builders-london
   ```

---

## Adding Cortex Analyst (Text-to-SQL)

To add a Cortex Analyst tab that queries the semantic views via natural language:

1. Create `app-ui/app/api/analyst/route.ts`:
```typescript
import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const { question } = await req.json()
  const rows = await querySnowflake(`
    SELECT SNOWFLAKE.CORTEX.ANALYST(
      'ACCELERATE_AI_IN_FSI.CORTEX_ANALYST.COMPANY_DATA_8_CORE_FEATURED_TICKERS',
      '${question.replace(/'/g, "''")}'
    ) AS RESULT
  `)
  return Response.json({ result: (rows[0] as any)?.RESULT })
}
```

2. The semantic views available are:
   - `ACCELERATE_AI_IN_FSI.CORTEX_ANALYST.COMPANY_DATA_8_CORE_FEATURED_TICKERS`
   - `ACCELERATE_AI_IN_FSI.CORTEX_ANALYST.SNOWFLAKE_ANALYSTS_VIEW`

---

## AI_COMPLETE Pattern

All chat/explain features use `AI_COMPLETE` (not `SNOWFLAKE.CORTEX.COMPLETE`):

```typescript
const rows = await querySnowflake(
  `SELECT AI_COMPLETE('claude-sonnet-4-5', '${sfEscape(prompt)}') AS ANSWER`
)
const answer = (rows[0] as any)?.ANSWER ?? ""
```

**SSE streaming pattern** (word-by-word at 22ms/token):
```typescript
const words = answer.split(/(?<=\S)(?=\s)|(?<=\s)(?=\S)/)
const stream = new ReadableStream({
  async start(controller) {
    for (const token of words) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
      await delay(22)
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"))
    controller.close()
  },
})
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" }
})
```

---

## Design System (globals.css)

```css
/* Colour tokens */
--bg: #0a0f1e          /* page background */
--surface: #0e1628     /* card background */
--surface-2: #131d35   /* nested / input background */
--border: #1e2d4a
--text: #e2e8f0
--text-muted: #64748b
--primary: #29b5e8     /* Cortex Blue */
--gain: #10b981        /* green — positive / bullish */
--loss: #ef4444        /* red — negative / bearish */
--warning: #f59e0b     /* amber */
```

**Reusable CSS classes:** `.card`, `.card-header`, `.card-body`, `.card-title`, `.kpi-card`, `.kpi-label`, `.kpi-value`, `.kpi-sub`, `.kpi-value.gain`, `.kpi-value.loss`, `.data-table`, `.search-box`, `.search-input`, `.search-btn`, `.search-result`, `.chat-container`, `.chat-messages`, `.chat-msg.user`, `.chat-msg.assistant`, `.chat-bubble`, `.nrnt-alert`, `.filter-row`, `.filter-select`

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Argument of type 'number' is not assignable to parameter of type 'string'` | `parseFloat` expects string — use `(parseFloat(r.FIELD ?? "0") * 100)` not `parseFloat((r.FIELD ?? 0) * 100)` |
| `AI_COMPLETE is not a function` | Run `SELECT AI_COMPLETE('claude-sonnet-4-5', 'test')` — if it fails, fall back to `SELECT SNOWFLAKE.CORTEX.COMPLETE(...)` |
| Build `FAILED: command failed: exit status 1` | TypeScript error — check build logs via `snow sql -c fsi-builders-london -q "SELECT * FROM TABLE(...SPCS_GET_LOGS())"` |
| `STOCK_PRICE_TIMESERIES` returns nulls | The view is long-format — must use `MAX(CASE WHEN VARIABLE='...' THEN VALUE END)` GROUP BY DATE |
| Search returns `{}` or empty | `SNOWFLAKE.CORTEX.SEARCH_PREVIEW` returns a JSON string — parse with `JSON.parse(raw)` then access `.results` |
| App shows no data | Verify `DEFAULT_WH` is running: `snow sql -c fsi-builders-london -q "ALTER WAREHOUSE DEFAULT_WH RESUME"` |

---

## Key Differences from APC App

| | FSI AI Intelligence | AI Product Costing (APC) |
|---|---|---|
| **Database** | `ACCELERATE_AI_IN_FSI` | `APC_DB` |
| **Data** | Pre-existing FSI demo data | Synthetic SAP data inserted via SQL scripts |
| **SQL Setup** | None needed | Run `sql/01–06.sql` first |
| **Semantic model** | 3 semantic views already exist | Upload `APC_SV.yaml` to stage |
| **App name** | `FSI_AI_REACT_APP` | `AI_PRODUCT_COSTING` |
| **Stage** | `FSI_AI_REACT_APP_CODE` | `AI_PRODUCT_COSTING_CODE` |
| **Warehouse** | `DEFAULT_WH` | `APC_WH` |
| **AI function** | `AI_COMPLETE` | `AI_COMPLETE` (updated) |
| **URL subdomain** | `astf2ob-...` | `irtf2ob-...` |
