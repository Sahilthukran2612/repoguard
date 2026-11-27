import { NextResponse } from "next/server"

export async function POST(req) {
  try {
    const body = await req.json()
    const { owner, repo } = body

    if (
      !owner ||
      !repo ||
      typeof owner !== "string" ||
      typeof repo !== "string"
    ) {
      return NextResponse.json(
        { error: "Missing owner or repo" },
        { status: 400 }
      )
    }
    // Here you can add logic to process the repoUrl, e.g., fetch data from the repository
    const repoUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/HEAD?recursive=1`
    const response = await fetch(repoUrl, { "User-Agent": "repoguard" })
    if (!response.ok) {
      return NextResponse.json(
        { error: `GitHub request failed (${response.status})` },
        { status: response.status }
      )
    }

    const repoData = await response.json()
    const files = repoData.tree
      .filter((item) => item.type === "blob")
      .map((item) => item.path)
      .filter((path) => /\.(js|jsx|ts|tsx)$/.test(path))
      .filter((path) => !/(^|\/)(node_modules|dist|\.next)\//.test(path))
      .slice(0, 50)

    return NextResponse.json({ files }, { status: 200 })
  } catch (error) {
    console.error("Error in /api/repo:", error)
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
