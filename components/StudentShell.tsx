"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ensureStudentSession, flushEvents, track } from "@/lib/client-session";
import type { GameId } from "@/lib/types";

export function StudentShell({
  classCode,
  gameId,
  eyebrow,
  title,
  children
}: {
  classCode: string;
  gameId?: GameId | "entry";
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  const [sessionId, setSessionId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<"connecting" | "ready" | "error">("connecting");

  useEffect(() => {
    let mounted = true;
    setSessionStatus("connecting");
    ensureStudentSession(classCode)
      .then((session) => {
        if (!mounted) return;
        setSessionId(session.id);
        setSessionStatus("ready");
        track({
          studentSessionId: session.id,
          classCode,
          gameId: gameId || "entry",
          eventType: "page_view",
          targetId: title,
          payload: { path: window.location.pathname }
        });
        void flushEvents();
      })
      .catch(() => {
        if (!mounted) return;
        setSessionStatus("error");
      });
    return () => {
      mounted = false;
    };
  }, [classCode, gameId, title]);

  return (
    <main className="app-bg">
      <div className="grain" />
      <header className="topbar">
        <Link href={`/play/${classCode}`} className="brand">
          <span className="brand-mark">LA</span>
          <span>学习分析实训</span>
        </Link>
        <span className={`pill ${sessionStatus === "error" ? "border-danger text-danger" : ""}`}>
          {sessionStatus === "connecting" ? <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
          {sessionStatus === "ready" && sessionId ? `匿名 ${sessionId.slice(0, 4)}` : sessionStatus === "error" ? "连接失败" : "连接中"}
        </span>
      </header>
      <section className="container-shell pt-7 pb-5 sm:pt-10">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
      </section>
      {children}
    </main>
  );
}
