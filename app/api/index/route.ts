import { GoogleGenAI } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"
import { Chunk, chunkFile } from "../../../lib/chunk"

type Skipped = { path: string; reason: string }

export async function POST(req: NextRequest) {
  try {
    const { owner, repo, files } = await req.json()

    if (
      typeof owner !== "string" ||
      typeof repo !== "string" ||
      !owner ||
      !repo ||
      !Array.isArray(files) ||
      !files.every((f) => typeof f === "string")
    ) {
      return NextResponse.json(
        { error: "Missing owner, repo or files" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      )
    }

    const skipped: Skipped[] = []
    const perFile = await Promise.all(
      (files as string[]).slice(0, 20).map(async (path): Promise<Chunk[]> => {
        const safePath = path.split("/").map(encodeURIComponent).join("/")
        const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/HEAD/${safePath}`
        try {
          const res = await fetch(url)
          if (!res.ok) {
            skipped.push({ path, reason: `HTTP ${res.status}` })
            return []
          }
          return chunkFile(path, await res.text())
        } catch (err) {
          skipped.push({
            path,
            reason: err instanceof Error ? err.message : "fetch failed",
          })
          return []
        }
      })
    )

    const chunks = perFile.flat().slice(0, 80)
    const ai = new GoogleGenAI({ apiKey })
    const indexed: (Chunk & { embedding: number[] })[] = []

    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20)
      const result = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: batch.map((c) => ({
          parts: [{ text: `title: ${c.path} | text: ${c.text}` }],
        })),
        config: { outputDimensionality: 768 },
      })
      if (result.embeddings?.length !== batch.length)
        throw new Error("Embedding count mismatch")
      batch.forEach((c, j) => {
        const embedding = result.embeddings![j].values
        if (!embedding) throw new Error("Missing embedding values")
        indexed.push({ ...c, embedding })
      })
    }

    return NextResponse.json({ chunks: indexed, skipped }, { status: 200 })
  } catch (error) {
    console.error("Error in /api/index:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
