import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await querySnowflake(`
      SELECT
        RELATIVE_PATH,
        RATING,
        DATE_REPORT,
        CLOSE_PRICE,
        PRICE_TARGET,
        GROWTH,
        NAME_OF_REPORT_PROVIDER,
        DOCUMENT_TYPE,
        LEFT(SUMMARY, 600) AS SUMMARY
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.ANALYST_REPORTS
      WHERE SUMMARY IS NOT NULL
      ORDER BY DATE_REPORT DESC NULLS LAST
      LIMIT 30
    `)
    return Response.json({ rows })
  } catch (e) {
    console.error("[reports]", e)
    return Response.json({ rows: [] }, { status: 500 })
  }
}
