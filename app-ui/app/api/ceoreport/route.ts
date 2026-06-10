import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

function sfEscape(s: string) { return s.replace(/'/g, "''") }
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const IMAGES = [
  { file: "ceo_neuro_nectar_leaving_office_gone_bust.png",  desc: "CEO Dr. Marcus Sterling fleeing HQ with a suitcase dripping pink ice cream, 'TEMPORARILY CLOSED — FOR LEASE' sign behind him" },
  { file: "chinese_man_not_happy_angry_icecream.png",       desc: "Furious investor holding a melting Neuro-Nectar cone after losing life savings" },
  { file: "dev_team_icecream.png",                          desc: "Dev team eating their own product at their desks, claiming '10x productivity gains'" },
  { file: "eating_icecream.png",                            desc: "Early adopter consuming the ice cream with an expression of misguided hope" },
  { file: "icecream_brainfog_gone.png",                     desc: "Consumer in a daze post-consumption — brain fog status: profoundly worsened" },
  { file: "icecream_in_landfill_recall.png",                desc: "Industrial dumpster overflowing with 28 million recalled units, 'DO NOT CONSUME — UNSALEABLE'" },
  { file: "neuro_icecream.png",                             desc: "The flagship product in its marketing glory, before the FDA letter arrived" },
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

**PHOTOGRAPHIC EVIDENCE — embed these images in the article using [IMAGE:filename] markers:**
${IMAGES.map(img => `[IMAGE:${img.file}] — ${img.desc}`).join("\n")}

Write a gripping, long-form investigative news article (~700 words) in the style of a serious broadsheet newspaper. Structure it as:

## [Dramatic headline — make it devastating]

**By [Fictional Byline] | Financial Farce Correspondent**
*Published [recent plausible date]*

Opening paragraph: The shocking numbers (stock price, valuation, 62-day timeline)

Body: Write 5-6 paragraphs. Weave in direct CEO quotes from the transcript, analyst reactions, and references to the photographic evidence. Build tension as the scale of the disaster becomes clear.

**IMPORTANT — Image placement rules:**
- Place [IMAGE:ceo_neuro_nectar_leaving_office_gone_bust.png] at a natural break after the opening paragraph
- Place [IMAGE:icecream_in_landfill_recall.png] near the middle of the article, after discussing the recall
- Place [IMAGE:dev_team_icecream.png] near the end, as ironic comic relief
- Each [IMAGE:filename] tag must appear on its own line, between paragraphs
- Use EXACTLY the filenames listed above — do not change them

Include at least 3 direct CEO quotes (quotation marks, attributed to "Dr. Marcus Sterling").

End with a dark kicker sentence.

Use markdown: ## for headline, **bold** for key facts, > for CEO quotes. [IMAGE:filename] tags are placed between paragraphs on their own line.`

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
