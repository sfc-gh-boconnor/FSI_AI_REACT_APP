import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

function sfEscape(s: string) { return s.replace(/'/g, "''") }
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const IMAGE_SUMMARIES = [
  "CEO Dr. Marcus Sterling photographed fleeing the NRNT headquarters with a suitcase dripping pink ice cream, office sign reading 'TEMPORARILY CLOSED — FOR LEASE'",
  "Furious investor holding a melting Neuro-Nectar cone after losing life savings",
  "Dev team photographed eating their own product at their desks, claiming '10x productivity gains'",
  "Early adopter consuming the ice cream with an expression of misguided hope",
  "Consumer photographed in a daze post-consumption — brain fog status: profoundly worsened",
  "Industrial dumpster overflowing with 28 million recalled units, sign reading 'DO NOT CONSUME — UNSALEABLE'",
  "The flagship Neuro-Nectar product in its marketing glory, before the FDA letter arrived",
]

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json()
    if (!transcript?.trim()) {
      return Response.json({ error: "No transcript provided" }, { status: 400 })
    }

    // Pull analyst report context via Cortex Search
    let analystContext = ""
    try {
      const searchBody = JSON.stringify({ query: "Neuro-Nectar NRNT cognitive enhancement collapse FDA recall", limit: 4 })
      const searchRows = await querySnowflake(`
        SELECT SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
          'ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.ANALYST_REPORTS_SEARCH',
          '${sfEscape(searchBody)}'
        ) AS RESULTS
      `)
      const raw = (searchRows[0] as any)?.RESULTS
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw
      const results = parsed?.results ?? []
      analystContext = results
        .map((r: any, i: number) => `Analyst ${i + 1} (${r.NAME_OF_REPORT_PROVIDER ?? "Unknown"}, ${r.RATING ?? "N/A"}): ${(r.SUMMARY ?? r.FULL_TEXT ?? "").slice(0, 300)}`)
        .join("\n\n")
    } catch (e) {
      console.warn("[ceoreport] analyst search failed, continuing without:", e)
    }

    // Extract key CEO quotes (first 2000 chars of transcript is plenty for quotes)
    const transcriptExcerpt = transcript.slice(0, 2500)

    const prompt = `You are a Pulitzer-Prize-winning investigative journalist writing the definitive long-form exposé on the collapse of Neuro-Nectar ($NRNT), the "AI-powered cognitive enhancement ice cream" startup that went from $3.7B valuation to bankruptcy in 62 days.

You have exclusive access to:

**CEO INTERVIEW TRANSCRIPT (AI_TRANSCRIBE — verbatim):**
${transcriptExcerpt}

**ANALYST REPORTS:**
${analystContext || "Wall Street was uniformly bullish until the FDA letter arrived."}

**PHOTOGRAPHIC EVIDENCE FROM THE SCENE:**
${IMAGE_SUMMARIES.map((s, i) => `Photo ${i + 1}: ${s}`).join("\n")}

Write a gripping, long-form investigative news article (600-800 words) in the style of a serious financial newspaper that slowly reveals the absurdity of what happened. Structure it as:

## [Dramatic headline — make it devastating]

**Byline and dateline**

Opening paragraph: The shocking numbers (stock price, valuation, timeline)

Body: Weave in direct CEO quotes from the transcript, analyst reactions, and references to the photographic evidence. Build tension as the scale of the disaster becomes clear.

Include at least 3 direct CEO quotes (use quotation marks, attribute to "Dr. Marcus Sterling").

End with a dark kicker — one final sentence that lands like a punchline.

Use markdown: ## for headline, **bold** for key facts, > for CEO quotes.`

    const aiRows = await querySnowflake(
      `SELECT AI_COMPLETE('claude-sonnet-4-5', '${sfEscape(prompt)}') AS ANSWER`
    )
    const article = ((aiRows[0] as any)?.ANSWER ?? "Article generation failed.").trim()

    // Stream word by word
    const encoder = new TextEncoder()
    const words = article.split(/(?<=\S)(?=\s)|(?<=\s)(?=\S)/)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const token of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            await delay(16)
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
    console.error("[ceoreport]", e)
    return Response.json({ error: "Report generation failed" }, { status: 500 })
  }
}
