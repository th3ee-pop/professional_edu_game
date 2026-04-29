import Link from "next/link";
import { defaultClassCode } from "@/lib/scenarios";

export default function DonePage() {
  return (
    <main className="app-bg">
      <div className="grain" />
      <div className="container-shell grid min-h-dvh content-center py-8">
        <section className="grid max-w-2xl gap-6">
          <p className="eyebrow">任务已提交</p>
          <h1 className="display-title">你的操作轨迹已经进入课堂分析池</h1>
          <p className="lead">
            接下来老师会打开后台看板，观察全班在证据阅读、流程判断、AI 依赖和错误修正中的共同规律。
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link className="secondary-button" href={`/play/${defaultClassCode}`}>返回任务首页</Link>
            <Link className="primary-button" href="/teacher/login">教师后台</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
