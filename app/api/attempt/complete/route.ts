import { NextResponse } from "next/server";
import { completeAttempt } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const attempt = await completeAttempt({
      studentSessionId: String(body.studentSessionId || ""),
      classCode: String(body.classCode || ""),
      gameId: body.gameId,
      score: Number(body.score || 0),
      resultLabel: String(body.resultLabel || "未完成"),
      startedAt: body.startedAt || null,
      answers: body.answers || {}
    });
    return NextResponse.json({ attempt });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to complete attempt" }, { status: 400 });
  }
}
