"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { defaultClassCode } from "@/lib/scenarios";
import { LoadingButton } from "@/components/LoadingButton";

export default function HomePage() {
  const router = useRouter();
  const [classCode, setClassCode] = useState(defaultClassCode);
  const [isEntering, setIsEntering] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsEntering(true);
    router.push(`/play/${encodeURIComponent(classCode.trim().toUpperCase() || defaultClassCode)}`);
  }

  return (
    <main className="app-bg">
      <div className="grain" />
      <div className="container-shell grid min-h-dvh content-center py-8">
        <section className="grid max-w-2xl gap-6">
          <div>
            <p className="eyebrow">职业教育数据驱动教学分析</p>
            <h1 className="display-title">把一次课堂操作变成可解释的过程证据</h1>
            <p className="lead">
              完成两个手机端模拟任务：制造设备诊断与护理流程判断。系统只记录匿名操作轨迹，用于课堂现场展示学习分析如何支持教学决策。
            </p>
          </div>
          <form className="grid max-w-md gap-3" onSubmit={submit}>
            <input
              className="form-input"
              aria-label="课堂码"
              value={classCode}
              disabled={isEntering}
              onChange={(event) => setClassCode(event.target.value)}
              placeholder="输入课堂码"
            />
            <LoadingButton loading={isEntering} loadingText="正在进入课堂" type="submit">
              进入课堂任务
            </LoadingButton>
          </form>
          <div className="flex flex-wrap gap-2.5">
            <a className="secondary-button" href="/teacher/login">教师后台</a>
            <span className="pill">默认课堂码 {defaultClassCode}</span>
          </div>
        </section>
      </div>
    </main>
  );
}
