import { NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const xff = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip");
  if (xff) headers["x-forwarded-for"] = xff;
  const userAgent = req.headers.get("user-agent");
  if (userAgent) headers["user-agent"] = userAgent;

  const upstream = await fetch(`${API_URL}/api/track/pageview`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  return new Response(JSON.stringify(await upstream.json()), {
    headers: { "Content-Type": "application/json" },
  });
}
