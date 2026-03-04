import { NextResponse } from "next/server";

// Public liveness endpoint — no auth required.
// Used by uptime monitoring services to verify the app is running.
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
