"use client";

import { useEffect, useState } from "react";
import type { Summary } from "@/lib/types";

export function TeacherDashboard({ classCode }: { classCode: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      if (active) setIsRefreshing(true);
      try {
        const response = await fetch(`/api/teacher/summary?classCode=${encodeURIComponent(classCode)}`, { cache: "no-store" });
        if (!response.ok) throw new Error("无法读取教师分析数据");
        const data = await response.json();
        if (active) {
          setSummary(data);
          setError("");
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        if (active) setIsRefreshing(false);
      }
    }
    void load();
    const timer = window.setInterval(load, 8000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [classCode]);

  if (error) {
    return <p className="container-shell py-8 font-bold text-danger">{error}，请回到教师登录页确认口令。</p>;
  }

  if (!summary) {
    return <p className="container-shell py-8 lead">正在读取课堂行为数据...</p>;
  }

  const started = Math.max(1, summary.participation.studentsStarted);

  return (
    <div className="container-shell py-8 pb-14">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">课堂码 {summary.classSession.classCode}</p>
          <h1 className="page-title">{summary.classSession.title}</h1>
          <p className="lead">每 8 秒刷新一次。当前已采集 {summary.eventCount} 条匿名过程事件。</p>
        </div>
        <span className="pill">
          {isRefreshing ? <span className="mr-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
          {isRefreshing ? "同步中" : `更新 ${new Date(summary.generatedAt).toLocaleTimeString()}`}
        </span>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="进入人数" value={summary.participation.studentsStarted} note="匿名学生会话" />
        <Metric title="制造完成" value={summary.participation.manufacturingCompleted} note={`${Math.round(summary.participation.manufacturingCompleted / started * 100)}% 完成`} />
        <Metric title="护理完成" value={summary.participation.nursingCompleted} note={`${Math.round(summary.participation.nursingCompleted / started * 100)}% 完成`} />
        <Metric title="平均用时" value={`${Math.round(summary.participation.avgDurationSeconds / 60)}m`} note="从进入到当前/完成" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h2>共性卡点</h2>
          {summary.bottlenecks.map((item) => (
            <div className="grid gap-1.5 py-2" key={item.label}>
              <strong className="tabular-nums">{item.label}：{item.value}</strong>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, item.value / started * 100)}%` }} /></div>
              <p>{item.detail}</p>
            </div>
          ))}
        </article>
        <article className="panel">
          <h2>路径分群</h2>
          {summary.clusters.map((cluster) => (
            <div className="grid gap-1.5 py-2" key={cluster.label}>
              <strong className="tabular-nums">{cluster.label}：{cluster.count}</strong>
              <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, cluster.count / started * 100)}%` }} /></div>
              <p>{cluster.description}</p>
            </div>
          ))}
        </article>
      </section>

      <section className="panel mt-4">
        <h2>可用于课堂讲解的教学洞察</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {summary.insights.map((insight) => (
            <article className="insight-card" key={insight}>
              <p>{insight}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: number | string; note: string }) {
  return (
    <article className="metric-card">
      <h3>{title}</h3>
      <div className="metric-value">{value}</div>
      <p>{note}</p>
    </article>
  );
}
