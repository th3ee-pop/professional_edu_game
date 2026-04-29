"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ensureStudentSession, flushEvents, getStoredSession, track } from "@/lib/client-session";
import { criticalNursingOrder, nursingMessages, nursingSteps } from "@/lib/scenarios";

export function NursingGame({ classCode }: { classCode: string }) {
  const router = useRouter();
  const [steps, setSteps] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [abnormal, setAbnormal] = useState("");
  const [hintOpen, setHintOpen] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [studentSessionId, setStudentSessionId] = useState("");

  const session = getStoredSession();

  useEffect(() => {
    ensureStudentSession(classCode).then((created) => setStudentSessionId(created.id));
  }, [classCode]);

  function toggleStep(id: string) {
    setSteps((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      if (studentSessionId) {
        track({
          studentSessionId,
          classCode,
          gameId: "nursing",
          eventType: "choice_toggle",
          targetId: id,
          payload: { selected: next.includes(id), sequence: next }
        });
      }
      return next;
    });
  }

  function moveStep(id: string, direction: -1 | 1) {
    setSteps((current) => {
      const index = current.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      if (studentSessionId) track({ studentSessionId, classCode, gameId: "nursing", eventType: "answer_changed", targetId: "step_order", payload: { sequence: next } });
      return next;
    });
  }

  const score = useMemo(() => {
    let next = 10;
    const required = criticalNursingOrder.filter((item) => steps.includes(item)).length;
    next += required * 8;
    const firstTwoSafe = steps[0] === "identity" && steps[1] === "handwash";
    if (firstTwoSafe) next += 15;
    if (message === "empathy") next += 15;
    if (message === "dismiss") next -= 20;
    if (abnormal === "report") next += 12;
    if (abnormal === "wait") next -= 12;
    return Math.max(0, Math.min(100, next));
  }, [abnormal, message, steps]);

  async function submit() {
    if (!session) return;
    const missing = criticalNursingOrder.filter((item) => !steps.includes(item));
    const label = score >= 82 ? "流程安全且沟通充分" : missing.length ? "存在流程遗漏" : "需要改善沟通或异常判断";
    track({
      studentSessionId: session.id,
      classCode,
      gameId: "nursing",
      eventType: "attempt_submit",
      targetId: "nursing",
      payload: { steps, message, abnormal, score, missing }
    });
    await flushEvents();
    await fetch("/api/attempt/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentSessionId: session.id,
        classCode,
        gameId: "nursing",
        score,
        resultLabel: label,
        startedAt,
        answers: { steps, message, abnormal, missing }
      })
    });
    router.push("/done");
  }

  return (
    <div className="container-shell grid gap-4 pb-12">
      <section className="panel">
        <h2>情境</h2>
        <p>术后 6 小时患者主诉疼痛加重，并反复询问“是不是出问题了”。床旁设备显示心率略快，伤口敷料无明显渗血。你需要完成安全核对、疼痛评估、沟通安抚和异常处置。</p>
        <button
          className="secondary-button mt-4"
          type="button"
          onClick={() => {
            setHintOpen(true);
            if (studentSessionId) track({ studentSessionId, classCode, gameId: "nursing", eventType: "hint_open", targetId: "nursing_flow_hint", payload: {} });
          }}
        >
          查看流程提示
        </button>
        {hintOpen ? <p className="mt-3 rounded-xl bg-mint-soft/55 p-3">真实护理评价会特别关注前置安全步骤：身份核对、手卫生、评估，再进入沟通和处置。</p> : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="panel">
          <h2>选择并排列护理步骤</h2>
          <div className="grid gap-2.5">
            {nursingSteps.map((step) => (
              <button className={`step-choice ${steps.includes(step.id) ? "active" : ""}`} key={step.id} onClick={() => toggleStep(step.id)} type="button">
                {step.label}
              </button>
            ))}
          </div>
        </article>
        <article className="panel">
          <h2>当前流程顺序</h2>
          <div className="grid gap-2.5">
            {steps.length ? steps.map((stepId, index) => {
              const step = nursingSteps.find((item) => item.id === stepId);
              return (
                <div className="choice active" key={stepId}>
                  <strong>{index + 1}. {step?.label}</strong>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="secondary-button min-h-9 px-3" onClick={() => moveStep(stepId, -1)} type="button">上移</button>
                    <button className="secondary-button min-h-9 px-3" onClick={() => moveStep(stepId, 1)} type="button">下移</button>
                  </div>
                </div>
              );
            }) : <p>请从左侧选择步骤。步骤顺序会进入后台过程分析。</p>}
          </div>
        </article>
      </section>

      <section className="panel">
        <h2>选择沟通回应</h2>
        <div className="grid gap-2.5">
          {nursingMessages.map((item) => (
            <button className={`choice ${message === item.id ? "active" : ""}`} key={item.id} onClick={() => {
              if (message && message !== item.id && studentSessionId) track({ studentSessionId, classCode, gameId: "nursing", eventType: "answer_changed", targetId: "communication", payload: { from: message, to: item.id } });
              setMessage(item.id);
            }} type="button">
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>异常判断</h2>
        <div className="grid gap-2.5">
          <button className={`choice ${abnormal === "report" ? "active" : ""}`} onClick={() => setAbnormal("report")} type="button">疼痛加重且心率升高，复测后报告医生并记录</button>
          <button className={`choice ${abnormal === "wait" ? "active" : ""}`} onClick={() => setAbnormal("wait")} type="button">先安慰患者，暂不报告，等待下一次巡视</button>
          <button className={`choice ${abnormal === "medicine" ? "active" : ""}`} onClick={() => setAbnormal("medicine")} type="button">直接给止痛药，不需要重新评估</button>
        </div>
        <div className="score-band mt-4">
          <span className="font-black tabular-nums">过程完整度 {score}</span>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${score}%` }} /></div>
        </div>
        <button className="primary-button mt-4 w-full sm:w-fit" disabled={steps.length < 4 || !message || !abnormal} onClick={submit} type="button">提交护理任务</button>
      </section>
    </div>
  );
}
