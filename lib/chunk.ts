export type Chunk = {
  path: string
  endLine: number
  text: string
  startLine: number
}

export function chunkFile(
  path: string,
  content: string,
  size = 60,
  overlap = 10
): Chunk[] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new RangeError("size must be a positive integer")
  }
  if (!Number.isInteger(overlap) || overlap < 0 || overlap >= size) {
    throw new RangeError(
      "overlap must be a non-negative integer smaller than size"
    )
  }

  if (content.length === 0) return []

  const lines = content.split(/\r?\n/)
  const chunks: Chunk[] = []
  const step = size - overlap

  for (let start = 0; start < lines.length; start += step) {
    const end = Math.min(start + size, lines.length)
    chunks.push({
      path,
      startLine: start + 1,
      endLine: end,
      text: lines.slice(start, end).join("\n"),
    })
    if (end === lines.length) break
  }

  return chunks
}
