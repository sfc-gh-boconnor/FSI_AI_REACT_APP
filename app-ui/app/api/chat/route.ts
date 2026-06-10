import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

function sfEscape(s: string) { return s.replace(/'/g, "''") }

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

const SYSTEM_PROMPT = `You are an expert FSI (Financial Services Industry) analyst AI assistant.

You have access to:
- Snowflake (SNOW) earnings call transcripts from Q1-Q3 FY2025 with AI sentiment analysis
- 30 analyst research reports on Snowflake from top providers
- Real-time stock price data (SNOW: NYSE)
- Social media intelligence on $NRNT (Neuro-Nectar) — a fictional nootropic startup that went viral before going bankrupt

Key facts:
- Snowflake Q3 FY2025 earnings: 79% positive sentiment (strongest quarter)
- Snowflake Q2 FY2025: 41% positive (mixed reaction to guidance)
- Snowflake Q1 FY2025: 54% positive
- NRNT (Neuro-Nectar): social sentiment ~0.37/1.0 (declining), down 60-64% from peak before bankruptcy
- NRNT was a fictional "magic nootropic ice cream" startup that had viral social media buzz before collapsing

Answer questions concisely with specific data points. Reference SAP, AI, or FSI terminology where relevant.`

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json()
    if (!question?.trim()) return Response.json({ error: "No question" }, { status: 400 })

    const prompt = `${SYSTEM_PROMPT}\n\nQuestion: ${sfEscape(question)}\n\nAnswer:`

    const rows = await querySnowflake(
      `SELECT AI_COMPLETE('claude-sonnet-4-5', '${sfEscape(prompt)}') AS ANSWER`
    )
    const answer = ((rows[0] as any)?.ANSWER ?? "Unable to generate response.").trim()

    // Stream word-by-word
    const encoder = new TextEncoder()
    const words = answer.split(/(?<=\S)(?=\s)|(?<=\s)(?=\S)/)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for (const token of words) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
            await delay(22)
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
    console.error("[chat]", e)
    return Response.json({ error: "Chat failed" }, { status: 500 })
  }
}
