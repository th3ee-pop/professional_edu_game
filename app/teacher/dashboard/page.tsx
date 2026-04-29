import Link from "next/link";
import { TeacherDashboard } from "@/components/TeacherDashboard";
import { defaultClassCode } from "@/lib/scenarios";

export default async function TeacherDashboardPage({ searchParams }: { searchParams: Promise<{ classCode?: string }> }) {
  const params = await searchParams;
  const classCode = params.classCode || defaultClassCode;

  return (
    <main className="app-bg">
      <div className="grain" />
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">LA</span>
          <span>教师分析后台</span>
        </Link>
        <Link className="pill" href="/teacher/login">切换课堂</Link>
      </header>
      <TeacherDashboard classCode={classCode} />
    </main>
  );
}
