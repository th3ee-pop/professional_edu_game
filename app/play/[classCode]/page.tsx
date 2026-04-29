import Link from "next/link";
import { StudentShell } from "@/components/StudentShell";
import { games } from "@/lib/scenarios";

export default async function PlayHome({ params }: { params: Promise<{ classCode: string }> }) {
  const { classCode } = await params;

  return (
    <StudentShell classCode={classCode} eyebrow="匿名课堂任务" title="请选择一个模拟实训任务开始">
      <div className="container-shell grid gap-4 pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          <article className="task-card">
            <span className="pill w-fit">{games.manufacturing.minutes}</span>
            <h2>{games.manufacturing.title}</h2>
            <p>阅读 AI 预警、振动曲线、温度变化和维护记录，判断设备是否存在轴承故障风险，并提出维护方案。</p>
            <Link className="primary-button" href={`/play/${classCode}/manufacturing`}>开始制造诊断</Link>
          </article>
          <article className="task-card">
            <span className="pill w-fit">{games.nursing.minutes}</span>
            <h2>{games.nursing.title}</h2>
            <p>面对术后疼痛与焦虑患者，选择合理护理步骤和沟通方式，体验“过程证据”如何影响智能评价。</p>
            <Link className="primary-button" href={`/play/${classCode}/nursing`}>开始护理流程</Link>
          </article>
        </div>
        <section className="panel">
          <h2>数据说明</h2>
          <p>本活动只生成匿名课堂编号，记录页面查看、停留、选择、修改、提示打开和完成结果。后台展示的是全班规律，不用于个人排名。</p>
        </section>
      </div>
    </StudentShell>
  );
}
