import { querySnowflake } from "@/lib/snowflake"
import { NextRequest } from "next/server"
export const dynamic = "force-dynamic"

function sfEscape(s: string) { return s.replace(/'/g, "''") }

// Short textual description for each image to give AI_COMPLETE visual context
const IMAGE_DESCRIPTIONS: Record<string, string> = {
  "ceo_neuro_nectar_leaving_office_gone_bust.png":
    "A man in a grey suit carrying a suitcase dripping with pink liquid walks away from a building with a 'NEURO NECTAR — TEMPORARILY CLOSED' sign and a 'FOR LEASE' notice. Pink ice cream is splattered on the pavement.",
  "chinese_man_not_happy_angry_icecream.png":
    "An angry man looking furious while holding a melting pink ice cream cone. He appears deeply betrayed by the dessert.",
  "dev_team_icecream.png":
    "A group of software developers eating pink Neuro-Nectar ice cream at their desks, surrounded by monitors and looking intensely focused — or possibly just sugar-high.",
  "eating_icecream.png":
    "Someone enthusiastically eating a pink Neuro-Nectar ice cream cone with an expression of pure bliss, apparently feeling 'smarter already'.",
  "icecream_brainfog_gone.png":
    "A person staring blankly into space after eating Neuro-Nectar ice cream, with visual effects suggesting brain fog has either lifted — or arrived.",
  "icecream_in_landfill_recall.png":
    "An industrial dumpster overflowing with pink Neuro-Nectar ice cream cups. A sign reads 'RECALL — DO NOT CONSUME! UNSALEABLE'.",
  "neuro_icecream.png":
    "A marketing-style photo of the Neuro-Nectar pink ice cream product in its prime — glossy, promising, and completely unregulated.",
}

export async function POST(req: NextRequest) {
  try {
    const { filename, posts } = await req.json()
    if (!filename) return Response.json({ error: "No filename" }, { status: 400 })

    const imageDesc = IMAGE_DESCRIPTIONS[filename] ?? `An image related to ${filename}`
    const postSummary = (posts ?? [])
      .slice(0, 3)
      .map((p: any) => `@${p.author} on ${p.platform}: "${p.text}" (${p.likes} likes)`)
      .join("\n")

    const prompt = `You are a sardonic financial journalist covering the spectacular collapse of Neuro-Nectar (NRNT), a fictional "cognitive-enhancement ice cream" startup that promised to cure brain fog and ended up going bankrupt amid a product recall.

Here is an image from their social media:
Visual description: ${imageDesc}

Associated social media posts:
${postSummary || "No posts found."}

Write a single, short, wickedly funny image caption (1-2 sentences max) in the style of a tabloid photo caption. Be punchy, irreverent, and highlight the absurdity of the situation. Do not use quotation marks around the caption.`

    const rows = await querySnowflake(
      `SELECT AI_COMPLETE('claude-sonnet-4-5', '${sfEscape(prompt)}') AS ANSWER`
    )
    const caption = ((rows[0] as any)?.ANSWER ?? "No caption available.").trim()

    return Response.json({ caption })
  } catch (e) {
    console.error("[caption]", e)
    return Response.json({ error: "Caption generation failed" }, { status: 500 })
  }
}
