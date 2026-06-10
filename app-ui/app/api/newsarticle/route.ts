import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

function sfEscape(s: string) { return s.replace(/'/g, "''") }
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const IMAGE_SUMMARIES = [
  "CEO spotted fleeing the building with a suitcase dripping pink ice cream, office sign reading 'TEMPORARILY CLOSED — FOR LEASE'",
  "Furious investor holding a melting Neuro-Nectar cone after losing his savings",
  "Dev team photographed eating product at their desks, claiming it made them '10x more productive'",
  "Early customer eating the ice cream with an expression of misguided hope",
  "Consumer photographed in a daze after consuming Neuro-Nectar, brain fog status: unclear",
  "Industrial dumpster overflowing with recalled product, sign reading 'DO NOT CONSUME — UNSALEABLE'",
  "The flagship Neuro-Nectar product in its glory days, before the FDA got involved",
]

export async function POST(req: NextRequest) {
  try {
    const { posts } = await req.json()

    const topPosts = (posts ?? [])
      .slice(0, 8)
      .map((p: any) => `- @${p.author} (${p.platform}): "${p.text}"`)
      .join("\n")

    const imageSummaryText = IMAGE_SUMMARIES.map((s, i) => `Photo ${i + 1}: ${s}`).join("\n")

    const prompt = `You are a Pulitzer-hungry journalist at The Financial Farce, a satirical financial news outlet. Write a dramatic, mock-serious breaking news article about the collapse of Neuro-Nectar ($NRNT), a fictional "cognitive-enhancement ice cream" startup.

Context — photographic evidence from the scene:
${imageSummaryText}

Context — social media reaction:
${topPosts || "Social media was briefly on fire before everyone moved on."}

Write a full satirical news article with:
- A dramatic tabloid headline
- A dateline (e.g. "SAN FRANCISCO, CA —")
- 4-5 paragraphs of mock-serious journalism
- At least one fake analyst quote
- References to the product recall, the fleeing CEO, and investor losses
- End with a darkly comic kicker line

Tone: The Onion meets Bloomberg. Keep it punchy and entertaining. Use markdown formatting with ## for the headline.`

    const rows = await querySnowflake(
      `SELECT AI_COMPLETE('claude-sonnet-4-5', '${sfEscape(prompt)}') AS ANSWER`
    )
    const article = ((rows[0] as any)?.ANSWER ?? "Article generation failed.").trim()

    // Stream word-by-word
    const encoder = new TextEncoder()
    const words = article.split(/(?<=\S)(?=\s)|(?<=\s)(?=\S)/)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const token of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            await delay(18)
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          controller.close()
        } catch { controller.close() }
      },
    })

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" },
    })
  } catch (e) {
    console.error("[newsarticle]", e)
    return Response.json({ error: "News article generation failed" }, { status: 500 })
  }
}
