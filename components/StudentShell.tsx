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

  useEffect(() => {
    let mounted = true;
    ensureStudentSession(classCode).then((session) => {
      if (!mounted) return;
      setSessionId(session.id);
      track({
        studentSessionId: session.id,
        classCode,
        gameId: gameId || "entry",
        eventType: "page_view",
        targetId: title,
        payload: { path: window.location.pathname }
      });
      void flushEvents();
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
        <span className="pill">{sessionId ? `匿名 ${sessionId.slice(0, 4)}` : "连接中"}</span>
      </header>
      <section className="container-shell pt-7 pb-5 sm:pt-10">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
      </section>
      {children}
    </main>
  );
}
