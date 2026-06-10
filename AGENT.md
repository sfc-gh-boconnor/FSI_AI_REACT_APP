# FSI AI Intelligence — Agent Orchestration Guide

This file tells Cortex Code everything it needs to build, extend, and deploy this app from scratch.

## What this app is

A dark-themed financial intelligence dashboard deployed as a **Snowflake App Runtime** (Next.js on SPCS). It uses **Snowflake Cortex AI** throughout — no external AI APIs. It covers two storylines:

1. **Snowflake (SNOW)** — real earnings call transcripts, analyst reports, stock signals
2. **Neuro-Nectar ($NRNT)** — a fictional "AI-powered cognitive enhancement ice cream" startup that collapsed in 62 days, used as a satirical showcase of social media intelligence and AI features

---

## Snowflake account (FSI HOL)

```
Account:    SFSEHOL-FSI_BUILDERS_WORKSHOP_LONDON_IFAJAJ
Connection: fsi-builders-london   (in ~/.snowflake/connections.toml, PAT auth)
Database:   ACCELERATE_AI_IN_FSI
Schema:     DEFAULT_SCHEMA
Warehouse:  DEFAULT_WH
App name:   ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.FSI_AI_REACT_APP
App URL:    https://astf2ob-sfsehol-fsi-builders-workshop-london-ifajaj.snowflakecomputing.app
GitHub:     https://github.com/sfc-gh-boconnor/FSI_AI_REACT_APP (public)
```

> All SQL, deploy commands, and `snow` CLI commands must use `--connection fsi-builders-london`.

---

## Project structure

```
FSI_AI_REACT_APP/
├── app-ui/                          ← Next.js app (everything that deploys)
│   ├── snowflake.yml                ← Snowflake App Runtime config (deploy target)
│   ├── app/
│   │   ├── globals.css              ← Dark theme CSS variables (--bg, --primary, --loss, etc.)
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/                     ← Server-side API routes (all call querySnowflake)
│   │       ├── market/              ← Stock data + NRNT KPIs
│   │       ├── sentiment/           ← Earnings call sentiment analysis
│   │       ├── reports/             ← Analyst report list
│   │       ├── social/              ← NRNT social media posts
│   │       ├── search/              ← Cortex Search (SEARCH_PREVIEW 2-arg format)
│   │       ├── chat/                ← AI_COMPLETE copilot (SSE streaming)
│   │       ├── caption/             ← AI_COMPLETE per-image captions
│   │       ├── gallery/             ← NRNT image metadata from SOCIAL_MEDIA_NRNT
│   │       ├── newsarticle/         ← AI_COMPLETE satirical article (SSE streaming)
│   │       ├── transcribe/          ← AI_TRANSCRIBE on staged CEO interview MP3
│   │       └── ceoreport/           ← AI_COMPLETE investigative article (SSE streaming)
│   ├── components/
│   │   ├── Dashboard.tsx            ← Shell: tabs + header (ADD NEW TABS HERE)
│   │   ├── MarketPanel.tsx
│   │   ├── EarningsPanel.tsx
│   │   ├── AnalystPanel.tsx
│   │   ├── SignalPanel.tsx
│   │   ├── CopilotPanel.tsx
│   │   ├── GalleryPanel.tsx
│   │   └── CEOPanel.tsx
│   ├── lib/
│   │   └── snowflake.ts             ← querySnowflake() helper — ALWAYS use this for SQL
│   └── public/
│       ├── images/                  ← 7 NRNT social media images (served statically)
│       └── audio/                   ← ceo_interview_nrnt.mp3 (HTML5 audio player)
└── sql/                             ← Reference SQL (not deployed, for setup only)
```

---

## Snowflake data sources

| Table / Object | What it contains |
|----------------|-----------------|
| `SOCIAL_MEDIA_NRNT` | 200+ NRNT social posts with `IMAGE_FILENAME`, `TEXT`, `SENTIMENT`, `LIKES`, `RETWEETS`, `PLATFORM`, `AUTHOR_HANDLE` |
| `ANALYST_REPORTS` | 30 Snowflake analyst reports with `SUMMARY`, `RATING`, `PRICE_TARGET`, `NAME_OF_REPORT_PROVIDER`, `DATE_REPORT`, `FULL_TEXT` |
| `FULL_TRANSCRIPTS` | SNOW earnings call transcript segments with `TEXT`, `RELATIVE_PATH`, `SENTIMENT`, `SENTIMENT_SCORE` |
| `NRNT_AUDIO_STAGE` | Internal stage holding `ceo_interview_nrnt.mp3` for `AI_TRANSCRIBE` |
| `CSV_DATA_STAGE` | Raw CSV data (earnings, social, reports) |

### Cortex Search services (all ACTIVE)

| Service name | Search column | Use case |
|---|---|---|
| `SNOW_FULL_EARNINGS_CALLS` | `TEXT` | Earnings transcript semantic search |
| `ANALYST_REPORTS_SEARCH` | `FULL_TEXT` | Analyst report semantic search |
| `DOW_ANALYSTS_SENTIMENT_ANALYSIS` | `FULL_TRANSCRIPT_TEXT` | Dow analyst sentiment search |
| `EMAILS` | `HTML_CONTENT` | Email search |
| `INFOGRAPHICS_SEARCH` | `BRANDING` | Infographic search |

---

## Critical patterns — read before writing any code

### 1. All Snowflake queries go through `querySnowflake`

```ts
import { querySnowflake } from "@/lib/snowflake"
const rows = await querySnowflake(`SELECT ...`)
const value = (rows[0] as any)?.COLUMN_NAME
```

Never use the Snowflake SDK directly. Never use `fetch` to call Snowflake APIs.

### 2. AI_COMPLETE — text generation

```ts
function sfEscape(s: string) { return s.replace(/'/g, "''") }

const rows = await querySnowflake(
  `SELECT AI_COMPLETE('claude-sonnet-4-5', '${sfEscape(prompt)}') AS ANSWER`
)
const answer = ((rows[0] as any)?.ANSWER ?? "").trim()
```

Always use `claude-sonnet-4-5`. Escape the prompt with `sfEscape` before embedding in SQL.

### 3. Streaming responses (SSE word-by-word)

All AI_COMPLETE routes that generate long text use SSE streaming. Copy this pattern:

```ts
export const dynamic = "force-dynamic"
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// After getting `answer` string from AI_COMPLETE:
const encoder = new TextEncoder()
const words = answer.split(/(?<=\S)(?=\s)|(?<=\s)(?=\S)/)
const stream = new ReadableStream({
  async start(controller) {
    for (const token of words) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
      await delay(18)
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"))
    controller.close()
  },
})
return new Response(stream, {
  headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
})
```

Client-side SSE consumption (from any `"use client"` component):

```ts
const res = await fetch("/api/myroute", { method: "POST", ... })
const reader = res.body!.getReader()
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
    if (payload === "[DONE]") break
    try { setText(prev => prev + JSON.parse(payload).token) } catch { /* skip */ }
  }
}
```

### 4. Cortex Search — SEARCH_PREVIEW (2-arg format)

**This account's `SEARCH_PREVIEW$V1` takes exactly 2 arguments.** The second argument is a JSON string, NOT a plain query string.

```ts
// CORRECT
const searchBody = JSON.stringify({ query: myQuery, limit: 5 })
const rows = await querySnowflake(`
  SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
    'ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SNOW_FULL_EARNINGS_CALLS',
    '${sfEscape(searchBody)}'
  ) AS RESULTS
`)
const raw = (rows[0] as any)?.RESULTS
const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
const results = parsed?.results ?? []

// WRONG — causes "too many arguments" SQL error, silently returns []
// SEARCH_PREVIEW(service, query_string, OBJECT_CONSTRUCT('limit', 5))
```

### 5. AI_TRANSCRIBE — staged audio files

```ts
const rows = await querySnowflake(`
  SELECT AI_TRANSCRIBE(
    TO_FILE('@ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.NRNT_AUDIO_STAGE', 'filename.mp3')
  ) AS RESULT
`)
const raw = (rows[0] as any)?.RESULT
const result = typeof raw === "string" ? JSON.parse(raw) : raw
// result.text = transcript, result.audio_duration = seconds, result.language = "en"
```

### 6. Static assets

- Images: place in `public/images/`, reference as `/images/filename.png`
- Audio: place in `public/audio/`, reference as `/audio/filename.mp3`
- All `public/` content is served by Next.js and deployed automatically

### 7. CSS / Dark theme

All components use CSS variables defined in `app/globals.css`:

```
--bg:         #0a0f1e   (page background)
--surface:    #0e1628   (card background)
--surface-2:  #131d35   (nested surface)
--border:     #1e2d4a
--text:        #e2e8f0
--text-muted: #94a3b8
--primary:    #29b5e8   (Snowflake blue)
--gain:       #10b981   (green)
--loss:       #ef4444   (red)
```

Use `style={{ ... }}` inline — no Tailwind, no CSS modules. All new panels should follow the `card` / `card-header` / `card-title` / `card-body` CSS class pattern from `globals.css`.

### 8. Client components

All panel components must have `"use client"` at the top. API routes are server-only (no `"use client"`).

---

## Adding a new tab — step-by-step

1. **Create the API route(s)** in `app-ui/app/api/<name>/route.ts`
   - Import `querySnowflake` from `@/lib/snowflake`
   - Add `export const dynamic = "force-dynamic"`
   - Use `sfEscape()` on all user-supplied strings embedded in SQL

2. **Create the component** in `app-ui/components/<Name>Panel.tsx`
   - Add `"use client"` at the top
   - Use `useEffect`/`useState` for data fetching, `fetch("/api/<name>")` for API calls
   - Style with CSS variables (no Tailwind)

3. **Register the tab in `Dashboard.tsx`**:
   ```ts
   // In TABS array:
   { id: "mytab", label: "My Tab" }
   // In imports:
   import MyPanel from "./MyPanel"
   // In content section:
   {tab === "mytab" && <MyPanel />}
   ```

4. **Add static assets** (if needed) to `public/images/` or `public/audio/`

5. **If using AI_TRANSCRIBE on a new audio file**, stage it first:
   ```bash
   snow sql -q "PUT file:///abs/path/file.mp3 @ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.NRNT_AUDIO_STAGE AUTO_COMPRESS=FALSE" --connection fsi-builders-london
   ```

---

## Deploy workflow

```bash
# 1. Make changes in app-ui/

# 2. Commit and push
cd /path/to/FSI_AI_REACT_APP
git add -A && git commit -m "description" && git push origin main

# 3. Deploy (from project root or any directory)
snow app deploy --connection fsi-builders-london --project /abs/path/FSI_AI_REACT_APP/app-ui

# The deploy: bundles → uploads to FSI_AI_REACT_APP_CODE stage → builds image → upgrades SPCS service
# Takes ~3-5 minutes. App is live at the URL above when status shows "ready".
```

> **Never run `snow app deploy` from the repo root** — the `snowflake.yml` is in `app-ui/`, not the root. Always pass `--project /abs/path/app-ui`.

---

## Current tabs and what they demonstrate

| Tab | Cortex feature |
|-----|---------------|
| Market Overview | SQL query on `STOCK_DATA_COMBINED`, `SOCIAL_MEDIA_NRNT` |
| Earnings Intelligence | Cortex Search (`SNOW_FULL_EARNINGS_CALLS`) + sentiment charts |
| Analyst Research | Cortex Search (`ANALYST_REPORTS_SEARCH`) + report cards |
| NRNT Signals | Social media sentiment analysis, KPI cards |
| AI Copilot | `AI_COMPLETE` chat (SSE streaming) |
| 📸 NRNT Gallery | `AI_COMPLETE` image captions + satirical news article |
| 🎙️ CEO Confession | `AI_TRANSCRIBE` + Cortex Search + `AI_COMPLETE` investigative article |

---

## Common mistakes to avoid

- **Don't** use `OBJECT_CONSTRUCT` as a third arg to `SEARCH_PREVIEW` — this account uses the 2-arg JSON string format
- **Don't** hardcode the Snowflake account URL — the app uses SPCS token auth automatically via `lib/snowflake.ts`
- **Don't** call `AI_COMPLETE` with any model other than `claude-sonnet-4-5` in this account
- **Don't** create API routes without `export const dynamic = "force-dynamic"` — Next.js will cache them
- **Don't** forget `sfEscape()` on any string embedded directly into SQL — SQL injection risk
- **Don't** use `ARRAY_AGG` with `OBJECT_CONSTRUCT` without testing the result type — the Snowflake JS SDK sometimes returns parsed objects, sometimes JSON strings; always handle both with `typeof raw === "string" ? JSON.parse(raw) : raw`
