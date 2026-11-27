import { GoogleGenAI } from "@google/genai"
import { NextResponse } from "next/server"
export async function POST(req) {
  try {
    const body = await req.json()
    const question = body.question

    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 })
    }

    const client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    })

    const interaction = await client.interactions.create({
      model: "gemini-3.5-flash",
      input: question,
    })

    const answer = interaction.output_text || "No answer generated."

    return NextResponse.json({ answer: answer }, { status: 200 })
  } catch (error) {
    console.error("Error in /api/ask:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
