import { NextResponse } from "next/server";
import { startStudentSession } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const classCode = String(body.classCode || "");
    const deviceType = String(body.deviceType || request.headers.get("user-agent") || "unknown");
    const session = await startStudentSession(classCode, deviceType);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to start session" }, { status: 400 });
  }
}
