import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getTeacherSummary } from "@/lib/data";
import { defaultClassCode } from "@/lib/scenarios";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  if (cookieStore.get("teacher_auth")?.value !== "ok") {
    return NextResponse.json({ error: "未登录教师后台" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const classCode = searchParams.get("classCode") || defaultClassCode;
  try {
    const summary = await getTeacherSummary(classCode);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load summary" }, { status: 400 });
  }
}
