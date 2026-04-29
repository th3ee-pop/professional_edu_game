"use client";

import { useEffect } from "react";
import { flushEvents } from "@/lib/client-session";

export function EventFlush() {
  useEffect(() => {
    const timer = window.setInterval(flushEvents, 5000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushEvents();
    };
    window.addEventListener("pagehide", flushEvents);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", flushEvents);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
