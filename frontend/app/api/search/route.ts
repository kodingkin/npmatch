import { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";
const API_SECRET_KEY = process.env.API_SECRET_KEY ?? "SECRET";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstream = await fetch(`${API_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Secret-Key": API_SECRET_KEY },
    body: JSON.stringify(body),
  });

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    },
  });
}