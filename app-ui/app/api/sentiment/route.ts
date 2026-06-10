import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Per-call sentiment summary
    const callSentiment = await querySnowflake(`
      SELECT
        RELATIVE_PATH,
        COUNT(*) AS SEGMENTS,
        ROUND(AVG(CASE WHEN OVERALL_SENTIMENT='positive' THEN 1.0 WHEN OVERALL_SENTIMENT='negative' THEN -1.0 ELSE 0 END), 2) AS OVERALL_SCORE,
        ROUND(SUM(CASE WHEN COST_SENTIMENT='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS COST_POSITIVE_PCT,
        ROUND(SUM(CASE WHEN INNOVATION_SENTIMENT='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS INNOV_POSITIVE_PCT,
        ROUND(SUM(CASE WHEN PRODUCTIVITY_SENTIMENT='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS PROD_POSITIVE_PCT,
        ROUND(SUM(CASE WHEN COMPETITIVENESS_SENTIMENT='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS COMP_POSITIVE_PCT,
        ROUND(SUM(CASE WHEN CONSUMPTION_SENTIMENT='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS CONS_POSITIVE_PCT,
        ROUND(SUM(CASE WHEN OVERALL_SENTIMENT='positive' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS POSITIVE_PCT,
        ROUND(SUM(CASE WHEN OVERALL_SENTIMENT='negative' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0) AS NEGATIVE_PCT
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.AI_SENTIMENT_RESULTS
      GROUP BY RELATIVE_PATH
      ORDER BY RELATIVE_PATH
    `)

    // Top positive and negative segments
    const segments = await querySnowflake(`
      SELECT RELATIVE_PATH, OVERALL_SENTIMENT, LEFT(TEXT, 300) AS EXCERPT
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.AI_SENTIMENT_RESULTS
      WHERE OVERALL_SENTIMENT IN ('positive','negative')
        AND LENGTH(TEXT) > 50
      ORDER BY RELATIVE_PATH, OVERALL_SENTIMENT DESC
      LIMIT 30
    `)

    return Response.json({ callSentiment, segments })
  } catch (e) {
    console.error("[sentiment]", e)
    return Response.json({ callSentiment: [], segments: [] }, { status: 500 })
  }
}
