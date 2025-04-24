const CHROMA_URL = "http://localhost:8000";

export async function queryChroma(query: string) {
  const res = await fetch(`${CHROMA_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}
