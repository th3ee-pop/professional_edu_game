"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ensureStudentSession, flushEvents, getStoredSession, track } from "@/lib/client-session";
import { evidenceOptions, manufacturingOptions, manufacturingTabs } from "@/lib/scenarios";

const chartCopy: Record<string, { title: string; note: string; legend: [string, string]; rows: Array<[string, string, string]> }> = {
  "ai-warning": {
    title: "AI 预警依据权重",
    note: "模型把高频振动作为主要依据，但维护记录提示可能存在短时误报。",
    legend: ["振动异常 52%", "温度升高 24%"],
    rows: [
      ["模型置信度", "76%", "中高"],
      ["误报因素", "润滑后 6 天", "需复核"],
      ["建议动作", "降载复检", "优先"]
    ]
  },
  vibration: {
    title: "高频振动 25 分钟趋势",
    note: "蓝线是历史均值，红线是当前峰值，末段明显高于基线。",
    legend: ["历史均值", "当前峰值"],
    rows: [
      ["08:10", "3.2 mm/s", "正常"],
      ["08:25", "4.7 mm/s", "接近预警"],
      ["08:35", "5.8 mm/s", "异常"]
    ]
  },
  temperature: {
    title: "轴承座温度与停机阈值",
    note: "温度持续上升但还没到硬停机阈值，适合采取复检和降载策略。",
    legend: ["当前温度 69.1°C", "阈值 75°C"],
    rows: [
      ["08:10", "62.4°C", "基线"],
      ["08:25", "66.8°C", "升高"],
      ["08:35", "69.1°C", "未停机"]
    ]
  },
  maintenance: {
    title: "近一周维护线索",
    note: "润滑保养后出现短暂异响，既支持风险判断，也提醒要排除误报。",
    legend: ["6 天前润滑", "昨日异响"],
    rows: [
      ["D-6", "更换润滑脂", "可能扰动"],
      ["D-1", "短暂异响", "风险线索"],
      ["今日", "负载 87%", "工况偏高"]
    ]
  }
};

export function ManufacturingGame({ classCode }: { classCode: string }) {
  const router = useRouter();
  const [studentSessionId, setStudentSessionId] = useState("");
  const [activeTab, setActiveTab] = useState(manufacturingTabs[0].id);
  const [decision, setDecision] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [startedAt] = useState(new Date().toISOString());

  useEffect(() => {
    ensureStudentSession(classCode).then((session) => setStudentSessionId(session.id));
  }, [classCode]);

  useEffect(() => {
    if (!studentSessionId) return;
    track({
      studentSessionId,
      classCode,
      gameId: "manufacturing",
      eventType: "material_view",
      targetId: activeTab,
      payload: { label: manufacturingTabs.find((tab) => tab.id === activeTab)?.label }
    });
  }, [activeTab, classCode, studentSessionId]);

  const active = manufacturingTabs.find((tab) => tab.id === activeTab) || manufacturingTabs[0];
  const chart = chartCopy[active.id] || chartCopy["ai-warning"];
  const score = useMemo(() => {
    let next = 20;
    if (decision === "monitor") next += 35;
    if (decision === "stop") next += 18;
    if (evidence.includes("vibration")) next += 15;
    if (evidence.includes("temperature")) next += 10;
    if (evidence.includes("maintenance")) next += 15;
    if (evidence.includes("ai-only")) next -= 10;
    if (reflection.length >= 18) next += 10;
    return Math.max(0, Math.min(100, next));
  }, [decision, evidence, reflection]);

  function changeDecision(id: string) {
    if (decision && decision !== id && studentSessionId) {
      track({ studentSessionId, classCode, gameId: "manufacturing", eventType: "answer_changed", targetId: "decision", payload: { from: decision, to: id } });
    }
    setDecision(id);
  }

  function toggleEvidence(id: string) {
    setEvidence((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (studentSessionId) {
        track({ studentSessionId, classCode, gameId: "manufacturing", eventType: "choice_toggle", targetId: id, payload: { selected: next.includes(id) } });
      }
      return next;
    });
  }

  async function submit() {
    const session = getStoredSession();
    if (!session) return;
    const label = score >= 80 ? "证据整合较充分" : decision === "ignore" ? "存在忽视风险" : "需要补充证据解释";
    track({
      studentSessionId: session.id,
      classCode,
      gameId: "manufacturing",
      eventType: "attempt_submit",
      targetId: "manufacturing",
      payload: { decision, evidence, score }
    });
    await flushEvents();
    await fetch("/api/attempt/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentSessionId: session.id,
        classCode,
        gameId: "manufacturing",
        score,
        resultLabel: label,
        startedAt,
        answers: { decision, evidence, reflection }
      })
    });
    router.push(`/play/${classCode}/nursing`);
  }

  return (
    <div className="container-shell grid gap-4 pb-12">
      <section className="panel">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {manufacturingTabs.map((tab) => (
            <button
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="panel">
          <h2>{active.title}</h2>
          <p>{active.body}</p>
          <EvidenceChart type={active.id} title={chart.title} note={chart.note} legend={chart.legend} rows={chart.rows} />
          <p><strong className="text-ink">证据提示：</strong>{active.cue}</p>
        </article>
        <article className="panel">
          <h2>提交诊断方案</h2>
          <div className="grid gap-2.5">
            {manufacturingOptions.map((option) => (
              <button className={`choice ${decision === option.id ? "active" : ""}`} key={option.id} onClick={() => changeDecision(option.id)} type="button">
                {option.label}
              </button>
            ))}
          </div>
          <button
            className="secondary-button mt-4"
            type="button"
            onClick={() => {
              setHintOpen(true);
              if (studentSessionId) track({ studentSessionId, classCode, gameId: "manufacturing", eventType: "hint_open", targetId: "evidence_hint", payload: {} });
            }}
          >
            查看判断提示
          </button>
          {hintOpen ? <p className="mt-3 rounded-xl bg-copper-soft/45 p-3">合理方案通常不会只听 AI，也不会等到硬阈值报警才行动。请至少选择两类原始证据。</p> : null}
        </article>
      </section>

      <section className="panel">
        <h2>选择你的判断依据</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {evidenceOptions.map((item) => (
            <button className={`choice ${evidence.includes(item.id) ? "active" : ""}`} key={item.id} onClick={() => toggleEvidence(item.id)} type="button">
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>一句话说明维护建议</h2>
        <input className="form-input" value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="例如：降低负载运行，安排复检并准备轴承更换预案" />
        <div className="score-band mt-4">
          <span className="font-black tabular-nums">过程完整度 {score}</span>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${score}%` }} /></div>
        </div>
        <button className="primary-button mt-4 w-full sm:w-fit" disabled={!decision || evidence.length < 1} onClick={submit} type="button">提交并进入护理任务</button>
      </section>
    </div>
  );
}

function EvidenceChart({
  type,
  title,
  note,
  legend,
  rows
}: {
  type: string;
  title: string;
  note: string;
  legend: [string, string];
  rows: Array<[string, string, string]>;
}) {
  const bars =
    type === "ai-warning"
      ? [76, 52, 24]
      : type === "temperature"
        ? [69, 75, 62]
        : type === "maintenance"
          ? [35, 62, 78]
          : [32, 41, 58];

  return (
    <figure className="my-4 rounded-2xl border border-line bg-blueprint-soft/45 p-4">
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <span className="text-sm font-black text-ink">{title}</span>
        <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-black text-muted">模拟数据</span>
      </figcaption>
      <div className="grid gap-3 rounded-xl border border-line bg-surface/82 p-3">
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-black text-muted">
          <span className="rounded-lg bg-paper/80 px-2 py-1">采样间隔 5min</span>
          <span className="rounded-lg bg-paper/80 px-2 py-1">设备 M-02</span>
          <span className="rounded-lg bg-paper/80 px-2 py-1">负载 87%</span>
        </div>
        <div className="relative h-36 overflow-hidden rounded-xl border border-line bg-paper/70 p-3">
        <div className="absolute inset-x-3 bottom-9 top-4 grid grid-rows-3">
          <span className="border-t border-line/60" />
          <span className="border-t border-line/60" />
          <span className="border-t border-line/60" />
        </div>
        {type === "maintenance" ? (
          <div className="relative z-10 flex h-full items-end justify-between gap-3 px-1 pb-8">
            {["保养", "异响", "复检"].map((item, index) => (
              <div className="grid flex-1 gap-2" key={item}>
                <div className="rounded-t-lg bg-copper" style={{ height: `${bars[index]}px` }} />
                <span className="text-center text-[11px] font-bold text-muted">{item}</span>
              </div>
            ))}
          </div>
        ) : (
          <svg className="relative z-10 h-full w-full" viewBox="0 0 320 140" role="img" aria-label={title}>
            <polyline
              points={type === "temperature" ? "12,98 78,90 144,78 210,62 294,44" : "12,102 78,92 144,74 210,52 294,34"}
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points="12,104 78,102 144,99 210,97 294,96"
              fill="none"
              stroke="var(--color-blueprint)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.72"
            />
            {type === "ai-warning" ? (
              <text x="214" y="31" fill="var(--color-danger)" fontSize="18" fontWeight="900">76%</text>
            ) : null}
            {type === "temperature" ? (
              <line x1="8" x2="304" y1="30" y2="30" stroke="var(--color-copper)" strokeDasharray="8 8" strokeWidth="4" />
            ) : null}
          </svg>
        )}
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-surface/90 text-xs">
          {rows.map((row) => (
            <div className="grid grid-cols-[0.8fr_1fr_0.8fr] border-b border-line/70 last:border-b-0" key={row.join("-")}>
              <span className="px-3 py-2 font-black text-muted">{row[0]}</span>
              <span className="px-3 py-2 font-black tabular-nums text-ink">{row[1]}</span>
              <span className="px-3 py-2 font-bold text-copper">{row[2]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-muted">
        <span className="rounded-full bg-surface/80 px-2.5 py-1">{legend[0]}</span>
        <span className="rounded-full bg-surface/80 px-2.5 py-1">{legend[1]}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted">{note}</p>
    </figure>
  );
}
