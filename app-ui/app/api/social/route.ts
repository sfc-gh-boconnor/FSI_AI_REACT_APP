import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    // Weekly social sentiment trend for NRNT
    const trend = await querySnowflake(`
      SELECT
        DATE_TRUNC('week', TIMESTAMP::DATE) AS WEEK_START,
        COUNT(*) AS POSTS,
        ROUND(AVG(CAST(SENTIMENT AS FLOAT)), 3) AS AVG_SENTIMENT,
        SUM(LIKES) AS TOTAL_LIKES,
        SUM(RETWEETS) AS TOTAL_RETWEETS
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SOCIAL_MEDIA_NRNT
      GROUP BY 1
      ORDER BY 1
    `)

    // Platform breakdown
    const byPlatform = await querySnowflake(`
      SELECT PLATFORM, COUNT(*) AS POSTS, ROUND(AVG(CAST(SENTIMENT AS FLOAT)),2) AS AVG_SENT
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SOCIAL_MEDIA_NRNT
      GROUP BY PLATFORM ORDER BY POSTS DESC
    `)

    // Most viral posts (highest engagement)
    const viral = await querySnowflake(`
      SELECT
        TIMESTAMP, PLATFORM, AUTHOR_HANDLE,
        LEFT(TEXT, 280) AS TEXT,
        CAST(SENTIMENT AS FLOAT) AS SENTIMENT_SCORE,
        LIKES, RETWEETS, REPLIES
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SOCIAL_MEDIA_NRNT
      ORDER BY (LIKES + RETWEETS * 2) DESC
      LIMIT 10
    `)

    // Recent emails (show subject + date)
    const emails = await querySnowflake(`
      SELECT EMAIL_ID, SUBJECT, CREATED_AT
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.EMAIL_PREVIEWS
      ORDER BY CREATED_AT DESC
      LIMIT 10
    `)

    // Overall KPIs
    const kpis = await querySnowflake(`
      SELECT
        COUNT(*) AS TOTAL_POSTS,
        ROUND(AVG(CAST(SENTIMENT AS FLOAT)),3) AS OVERALL_SENTIMENT,
        SUM(LIKES) AS TOTAL_LIKES,
        MIN(TIMESTAMP) AS FIRST_SIGNAL,
        MAX(TIMESTAMP) AS LAST_SIGNAL
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SOCIAL_MEDIA_NRNT
    `)

    return Response.json({ trend, byPlatform, viral, emails, kpis: kpis[0] ?? {} })
  } catch (e) {
    console.error("[social]", e)
    return Response.json({ trend: [], byPlatform: [], viral: [], emails: [], kpis: {} }, { status: 500 })
  }
}
