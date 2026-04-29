import { criticalNursingOrder } from "./scenarios";
import type { ClassSession, GameAttempt, StudentSession, Summary, TrackingEvent } from "./types";

export function buildSummary(
  classSession: ClassSession,
  students: StudentSession[],
  events: TrackingEvent[],
  attempts: GameAttempt[]
): Summary {
  const manufacturingAttempts = attempts.filter((attempt) => attempt.gameId === "manufacturing");
  const nursingAttempts = attempts.filter((attempt) => attempt.gameId === "nursing");
  const bothCompleted = students.filter((student) => student.manufacturingDone && student.nursingDone).length;
  const durations = students
    .map((student) => {
      const end = student.completedAt || new Date().toISOString();
      return Math.max(0, (new Date(end).getTime() - new Date(student.startedAt).getTime()) / 1000);
    })
    .filter(Boolean);

  const evidenceEvents = events.filter((event) => event.eventType === "material_view");
  const hintEvents = events.filter((event) => event.eventType === "hint_open");
  const correctionEvents = events.filter((event) => event.eventType === "answer_changed");
  const aiFirst = firstMaterialCount(events, "ai-warning");
  const unsafeManufacturing = manufacturingAttempts.filter((attempt) => attempt.resultLabel.includes("风险")).length;
  const nursingOmissions = nursingAttempts.filter((attempt) => {
    const selected = Array.isArray(attempt.answers.steps) ? attempt.answers.steps : [];
    return criticalNursingOrder.some((step) => !selected.includes(step));
  }).length;

  const bottlenecks = [
    {
      label: "AI 结论优先阅读",
      value: aiFirst,
      detail: "第一眼先看 AI 预警，可能说明学生容易把模型结论当作判断起点。"
    },
    {
      label: "提示使用",
      value: hintEvents.length,
      detail: "提示打开次数越高，越能暴露任务说明或证据解释中的卡点。"
    },
    {
      label: "答案修正",
      value: correctionEvents.length,
      detail: "多次修正通常意味着学生正在经历证据冲突和策略调整。"
    },
    {
      label: "护理关键步骤遗漏",
      value: nursingOmissions,
      detail: "遗漏身份核对、手卫生或记录，会影响真实岗位流程安全。"
    }
  ];

  const fastCorrect = attemptsByStudent(attempts).filter((items) => {
    return items.length >= 2 && items.every((attempt) => attempt.score >= 80);
  }).length;
  const aiDependent = countStudentsWith(events, (items) => {
    const first = items.find((event) => event.eventType === "material_view");
    const evidenceCount = new Set(items.filter((event) => event.eventType === "material_view").map((event) => event.targetId)).size;
    return first?.targetId === "ai-warning" && evidenceCount <= 2;
  });
  const trialAndError = countStudentsWith(events, (items) => {
    return items.filter((event) => event.eventType === "answer_changed").length >= 2;
  });
  const processOmit = nursingOmissions;

  const clusters = [
    {
      label: "快速正确型",
      count: fastCorrect,
      description: "两项任务得分较高，可能具备较好的流程意识和证据整合能力。"
    },
    {
      label: "反复试错型",
      count: trialAndError,
      description: "多次修改关键选择，适合追问他们如何处理冲突证据。"
    },
    {
      label: "过度依赖 AI 型",
      count: aiDependent,
      description: "先看 AI 且证据阅读较少，适合引出算法解释与人工判断的关系。"
    },
    {
      label: "流程遗漏型",
      count: processOmit,
      description: "护理关键步骤不完整，说明结果正确不等于过程安全。"
    }
  ];

  const topMaterial = topTarget(evidenceEvents);
  const insights = [
    aiFirst > 0
      ? `${aiFirst} 名学生首先查看 AI 预警，可以用来讨论“模型结论是否会替代证据阅读”。`
      : "目前多数学生没有先看 AI 预警，可以引导他们比较原始数据与模型结论的差异。",
    topMaterial
      ? `停留和查看最集中的材料是“${topMaterial}”，说明这里可能是全班共同的证据入口或理解难点。`
      : "等待学生产生更多材料查看数据后，系统会形成证据阅读洞察。",
    unsafeManufacturing > 0
      ? `${unsafeManufacturing} 份制造诊断方案存在过度处理或忽视风险，适合讲解“安全边界下的合理决策”。`
      : "制造诊断暂未出现明显高风险方案，可进一步观察学生是否能解释判断依据。",
    nursingOmissions > 0
      ? `${nursingOmissions} 份护理流程遗漏关键步骤，能说明智能评价为什么要看过程而不只看结果。`
      : "护理流程关键步骤较完整，可以把讲解重点放在沟通质量和临场判断。"
  ];

  return {
    generatedAt: new Date().toISOString(),
    classSession,
    participation: {
      studentsStarted: students.length,
      manufacturingCompleted: manufacturingAttempts.length,
      nursingCompleted: nursingAttempts.length,
      bothCompleted,
      avgDurationSeconds: Math.round(durations.reduce((sum, item) => sum + item, 0) / Math.max(1, durations.length))
    },
    bottlenecks,
    clusters,
    insights,
    eventCount: events.length
  };
}

function attemptsByStudent(attempts: GameAttempt[]) {
  const map = new Map<string, GameAttempt[]>();
  for (const attempt of attempts) {
    map.set(attempt.studentSessionId, [...(map.get(attempt.studentSessionId) || []), attempt]);
  }
  return [...map.values()];
}

function countStudentsWith(events: TrackingEvent[], predicate: (events: TrackingEvent[]) => boolean) {
  const map = new Map<string, TrackingEvent[]>();
  for (const event of events) {
    map.set(event.studentSessionId, [...(map.get(event.studentSessionId) || []), event]);
  }
  return [...map.values()].filter(predicate).length;
}

function firstMaterialCount(events: TrackingEvent[], targetId: string) {
  const map = new Map<string, TrackingEvent[]>();
  for (const event of events.filter((item) => item.eventType === "material_view")) {
    map.set(event.studentSessionId, [...(map.get(event.studentSessionId) || []), event]);
  }
  return [...map.values()].filter((items) => {
    const first = items.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))[0];
    return first?.targetId === targetId;
  }).length;
}

function topTarget(events: TrackingEvent[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.targetId) counts.set(event.targetId, (counts.get(event.targetId) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
