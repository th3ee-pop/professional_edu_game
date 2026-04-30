"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { defaultClassCode } from "@/lib/scenarios";
import { LoadingButton } from "./LoadingButton";

export function TeacherLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [classCode, setClassCode] = useState(defaultClassCode);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (!response.ok) {
        setError("教师口令不正确");
        setIsSubmitting(false);
        return;
      }
      router.push(`/teacher/dashboard?classCode=${encodeURIComponent(classCode.trim().toUpperCase() || defaultClassCode)}`);
    } catch {
      setError("登录请求失败，请检查网络后重试。");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid max-w-md gap-3" onSubmit={submit}>
      <input className="form-input" disabled={isSubmitting} value={classCode} onChange={(event) => setClassCode(event.target.value)} placeholder="课堂码" aria-label="课堂码" />
      <input className="form-input" disabled={isSubmitting} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="教师口令" aria-label="教师口令" type="password" />
      <LoadingButton loading={isSubmitting} loadingText="正在进入看板" type="submit">
        进入分析看板
      </LoadingButton>
      {error ? <p className="font-bold text-danger">{error}</p> : null}
    </form>
  );
}
