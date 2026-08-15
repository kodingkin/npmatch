import { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const upstreamHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };
  // Forward the client's IP so the backend can rate-limit per user instead of
  // per proxy instance. The backend is only reachable through this route.
  const forwardedFor =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (forwardedFor) upstreamHeaders["x-forwarded-for"] = forwardedFor;

  const upstream = await fetch(`${API_URL}/api/search`, {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify(body),
  });

  // Forward the upstream status — a 429/502 must not reach the browser as a
  // 200, or the client would read the error body as an empty SSE stream.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: {
      // Error bodies are JSON, not SSE — forward the upstream content type.
      "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    },
  });
}