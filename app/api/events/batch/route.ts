import { NextResponse } from "next/server";
import { insertEvents } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events = Array.isArray(body.events) ? body.events : [];
    if (!events.length) return NextResponse.json({ inserted: 0 });
    const result = await insertEvents(events);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to insert events" }, { status: 400 });
  }
}
