import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const rows = await querySnowflake(`
      SELECT
        IMAGE_FILENAME,
        ARRAY_AGG(OBJECT_CONSTRUCT(
          'platform', PLATFORM,
          'author', AUTHOR_HANDLE,
          'text', TEXT,
          'sentiment', SENTIMENT,
          'likes', LIKES,
          'retweets', RETWEETS
        )) AS POSTS
      FROM ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.SOCIAL_MEDIA_NRNT
      WHERE IMAGE_FILENAME IS NOT NULL AND IMAGE_FILENAME != ''
      GROUP BY IMAGE_FILENAME
      ORDER BY IMAGE_FILENAME
    `)

    const images = rows.map((r: any) => ({
      filename: r.IMAGE_FILENAME,
      posts: typeof r.POSTS === "string" ? JSON.parse(r.POSTS) : r.POSTS,
    }))

    return Response.json({ images })
  } catch (e) {
    console.error("[gallery]", e)
    return Response.json({ error: "Failed to load gallery" }, { status: 500 })
  }
}
