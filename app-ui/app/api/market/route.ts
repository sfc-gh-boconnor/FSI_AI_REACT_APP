import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const ticker = searchParams.get("ticker") ?? "SNOW"
  const days = parseInt(searchParams.get("days") ?? "90")

  try {
    // Pivot the long-format timeseries into OHLCV
    const priceRows = await querySnowflake(`
      SELECT DATE,
        MAX(CASE WHEN VARIABLE='all-day_high' THEN VALUE END)      AS HIGH,
        MAX(CASE WHEN VARIABLE='all-day_low'  THEN VALUE END)      AS LOW,
        MAX(CASE WHEN VARIABLE='pre-market_open' THEN VALUE END)   AS OPEN,
        MAX(CASE WHEN VARIABLE='post-market_close' THEN VALUE END) AS CLOSE,
        MAX(CASE WHEN VARIABLE='nasdaq_volume' THEN VALUE END)     AS VOLUME
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.STOCK_PRICE_TIMESERIES
      WHERE TICKER = '${ticker}'
      GROUP BY DATE
      HAVING HIGH IS NOT NULL OR LOW IS NOT NULL OR CLOSE IS NOT NULL
      ORDER BY DATE DESC
      LIMIT ${days}
    `)

    // KPIs from latest available data
    const latest = priceRows[0] as any
    const prev = priceRows[1] as any
    const latestClose = parseFloat(latest?.CLOSE ?? latest?.HIGH ?? 0)
    const prevClose = parseFloat(prev?.CLOSE ?? prev?.HIGH ?? latestClose)
    const change = latestClose - prevClose
    const changePct = prevClose ? ((change / prevClose) * 100) : 0

    return Response.json({
      ticker,
      prices: priceRows.reverse(), // oldest first for chart
      kpis: {
        price: latestClose.toFixed(2),
        change: change.toFixed(2),
        changePct: changePct.toFixed(2),
        date: latest?.DATE,
      }
    })
  } catch (e) {
    console.error("[market]", e)
    return Response.json({ prices: [], kpis: {} }, { status: 500 })
  }
}
