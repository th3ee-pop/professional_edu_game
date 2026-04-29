import Link from "next/link";
import { TeacherLoginForm } from "@/components/TeacherLoginForm";

export default function TeacherLoginPage() {
  return (
    <main className="app-bg">
      <div className="grain" />
      <div className="container-shell grid min-h-dvh content-center py-8">
        <section className="grid max-w-2xl gap-6">
          <p className="eyebrow">教师后台</p>
          <h1 className="display-title">把学生刚才的操作转成课堂洞察</h1>
          <p className="lead">登录后可以查看参与进度、共性卡点、路径分群和可直接讲解的教学洞察。默认演示口令见 README。</p>
          <TeacherLoginForm />
          <Link className="secondary-button" href="/">返回学生入口</Link>
        </section>
      </div>
    </main>
  );
}
