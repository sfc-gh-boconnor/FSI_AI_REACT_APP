import { querySnowflake } from "@/lib/snowflake"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    const rows = await querySnowflake(`
      SELECT AI_TRANSCRIBE(
        TO_FILE('@ACCELERATE_AI_IN_FSI.DEFAULT_SCHEMA.NRNT_AUDIO_STAGE', 'ceo_interview_nrnt.mp3')
      ) AS RESULT
    `)

    const raw = (rows[0] as any)?.RESULT
    const result = typeof raw === "string" ? JSON.parse(raw) : raw

    return Response.json({
      transcript: result?.text ?? "",
      duration: result?.audio_duration ?? 0,
      language: result?.language ?? "en",
    })
  } catch (e) {
    console.error("[transcribe]", e)
    return Response.json({ error: "Transcription failed", transcript: "" }, { status: 500 })
  }
}
