import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const password = String(body.password || "");
  const expected = process.env.TEACHER_PASSWORD || "teacher-demo-2026";

  if (password !== expected) {
    return NextResponse.json({ error: "教师口令不正确" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("teacher_auth", "ok", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
