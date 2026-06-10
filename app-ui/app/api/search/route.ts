import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

function sfEscape(s: string) { return s.replace(/'/g, "''") }

export async function POST(req: NextRequest) {
  try {
    const { query, service = "earnings" } = await req.json()
    if (!query?.trim()) return Response.json({ results: [] }, { status: 400 })

    const serviceMap: Record<string, string> = {
      earnings: "ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SNOW_FULL_EARNINGS_CALLS",
      reports:  "ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.ANALYST_REPORTS_SEARCH",
      analysts: "ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.DOW_ANALYSTS_SENTIMENT_ANALYSIS",
    }
    const svc = serviceMap[service] ?? serviceMap.earnings

    const rows = await querySnowflake(`
      SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
        '${svc}',
        '${sfEscape(query)}',
        OBJECT_CONSTRUCT('limit', 5)
      ) AS RESULTS
    `)

    const raw = (rows[0] as any)?.RESULTS
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
    const results = parsed?.results ?? []

    return Response.json({ results })
  } catch (e) {
    console.error("[search]", e)
    return Response.json({ results: [], error: e instanceof Error ? e.message : "Search failed" }, { status: 500 })
  }
}
