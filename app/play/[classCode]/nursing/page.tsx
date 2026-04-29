import { NursingGame } from "@/components/NursingGame";
import { StudentShell } from "@/components/StudentShell";

export default async function NursingPage({ params }: { params: Promise<{ classCode: string }> }) {
  const { classCode } = await params;
  return (
    <StudentShell classCode={classCode} gameId="nursing" eyebrow="任务二：流程安全与沟通判断" title="处理术后疼痛与焦虑的护理情境">
      <NursingGame classCode={classCode} />
    </StudentShell>
  );
}
