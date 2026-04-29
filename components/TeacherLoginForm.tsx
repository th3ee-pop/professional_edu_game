"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { defaultClassCode } from "@/lib/scenarios";

export function TeacherLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState(defaultClassCode);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/teacher/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    if (!response.ok) {
      setError("教师口令不正确");
      return;
    }
    router.push(`/teacher/dashboard?classCode=${encodeURIComponent(classCode.trim().toUpperCase() || defaultClassCode)}`);
  }

  return (
    <form className="grid max-w-md gap-3" onSubmit={submit}>
      <input className="form-input" value={classCode} onChange={(event) => setClassCode(event.target.value)} placeholder="课堂码" aria-label="课堂码" />
      <input className="form-input" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="教师口令" aria-label="教师口令" type="password" />
      <button className="primary-button" type="submit">进入分析看板</button>
      {error ? <p className="font-bold text-danger">{error}</p> : null}
    </form>
  );
}
