import type { GameId } from "./types";

export const defaultClassCode = process.env.NEXT_PUBLIC_DEFAULT_CLASS_CODE || "AI2026";

export const games: Record<GameId, { title: string; shortTitle: string; minutes: string; accent: string }> = {
  manufacturing: {
    title: "智能制造设备故障诊断",
    shortTitle: "制造诊断",
    minutes: "8-12 分钟",
    accent: "copper"
  },
  nursing: {
    title: "护理情境流程判断",
    shortTitle: "护理流程",
    minutes: "8-12 分钟",
    accent: "mint"
  }
};

export const manufacturingTabs = [
  {
    id: "ai-warning",
    label: "AI 预警",
    title: "模型提示：轴承故障风险 76%",
    body: "模型认为 2 号设备存在早期轴承异常，主要依据是高频振动增强与温度缓慢升高。但近三次维护记录显示润滑调整后短时波动也可能造成误报。",
    cue: "请不要只看结论，要判断证据是否足够。"
  },
  {
    id: "vibration",
    label: "振动曲线",
    title: "振动信号：高频段出现持续抬升",
    body: "08:10-08:35 高频振动峰值从 3.2mm/s 上升至 5.8mm/s，超过本设备历史均值 42%。低频段变化不明显。",
    cue: "异常更像局部磨损，而不是整机松动。"
  },
  {
    id: "temperature",
    label: "温度变化",
    title: "温度：缓慢上升但未触发硬阈值",
    body: "轴承座温度从 62.4°C 上升至 69.1°C，低于 75°C 的停机阈值。环境温度稳定，班组负载略高。",
    cue: "温度支持风险判断，但不能单独作为停机依据。"
  },
  {
    id: "maintenance",
    label: "维护记录",
    title: "维护记录：上周更换润滑脂，昨日有轻微异响",
    body: "设备 6 天前完成润滑保养；昨日操作员记录短暂异响，10 分钟后消失。近 30 天未更换轴承。",
    cue: "历史记录能帮助判断 AI 预警是否是误报。"
  }
];

export const manufacturingOptions = [
  { id: "stop", label: "立即停机更换轴承", quality: "overreact" },
  { id: "monitor", label: "安排复检并降低负载运行", quality: "best" },
  { id: "ignore", label: "暂不处理，等待阈值报警", quality: "unsafe" }
];

export const evidenceOptions = [
  { id: "vibration", label: "振动高频段持续抬升" },
  { id: "temperature", label: "温度缓慢升高" },
  { id: "maintenance", label: "维护记录中出现异响" },
  { id: "ai-only", label: "AI 已经给出高风险结论" }
];

export const nursingSteps = [
  { id: "identity", label: "核对患者身份", kind: "safety" },
  { id: "handwash", label: "手卫生", kind: "safety" },
  { id: "pain", label: "询问疼痛部位与评分", kind: "assessment" },
  { id: "emotion", label: "回应焦虑并解释操作", kind: "communication" },
  { id: "vitals", label: "复测生命体征", kind: "assessment" },
  { id: "doctor", label: "异常时报告医生", kind: "decision" },
  { id: "record", label: "记录处置与反馈", kind: "documentation" }
];

export const nursingMessages = [
  { id: "direct", label: "你先别紧张，我按流程看一下。", quality: "thin" },
  { id: "empathy", label: "我看到你很担心，我们先确认疼痛情况，再一起处理。", quality: "best" },
  { id: "dismiss", label: "术后疼痛很正常，忍一忍就好。", quality: "unsafe" }
];

export const criticalNursingOrder = ["identity", "handwash", "pain", "emotion", "vitals", "doctor", "record"];
