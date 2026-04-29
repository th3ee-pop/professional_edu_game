"use client";

import type { GameId } from "./types";

type QueueEvent = {
  studentSessionId: string;
  classCode: string;
  gameId?: GameId | "entry" | "teacher";
  eventType: string;
  targetId?: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
};

const sessionKey = "vet_student_session";
const queueKey = "vet_event_queue";

export function getStoredSession() {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey);
  return raw ? JSON.parse(raw) as { id: string; classCode: string; startedAt: string } : null;
}

export function storeSession(session: { id: string; classCode: string; startedAt: string }) {
  window.localStorage.setItem(sessionKey, JSON.stringify(session));
}

export async function ensureStudentSession(classCode: string) {
  const stored = getStoredSession();

  const response = await startSessionRequest(classCode, stored?.classCode === classCode ? stored.id : undefined);
  if (!response.ok) {
    const retry = await startSessionRequest(classCode);
    if (!retry.ok) throw new Error("无法创建课堂会话");
    window.localStorage.removeItem(queueKey);
    return persistSession(await retry.json(), stored?.id);
  }
  return persistSession(await response.json(), stored?.id);
}

async function startSessionRequest(classCode: string, existingSessionId?: string) {
  return fetch("/api/session/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      classCode,
      deviceType: navigator.userAgent,
      existingSessionId
    })
  });
}

function persistSession(data: { session: { id: string; classCode: string; startedAt: string } }, previousId?: string) {
  const session = {
    id: data.session.id as string,
    classCode: data.session.classCode as string,
    startedAt: data.session.startedAt as string
  };
  if (previousId && previousId !== session.id) {
    window.localStorage.removeItem(queueKey);
  }
  storeSession(session);
  return session;
}

export function track(event: Omit<QueueEvent, "occurredAt">) {
  const next = [...readQueue(), { ...event, occurredAt: new Date().toISOString() }];
  window.localStorage.setItem(queueKey, JSON.stringify(next.slice(-120)));
}

export async function flushEvents() {
  const events = readQueue();
  if (!events.length) return;
  try {
    const response = await fetch("/api/events/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events })
    });
    if (response.ok) window.localStorage.removeItem(queueKey);
  } catch {
    // Keep the queue for the next flush attempt.
  }
}

function readQueue(): QueueEvent[] {
  const raw = window.localStorage.getItem(queueKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueueEvent[];
  } catch {
    return [];
  }
}
