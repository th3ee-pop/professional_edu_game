import { StudentShell } from "@/components/StudentShell";
import { ManufacturingGame } from "@/components/ManufacturingGame";

export default async function ManufacturingPage({ params }: { params: Promise<{ classCode: string }> }) {
  const { classCode } = await params;
  return (
    <StudentShell classCode={classCode} gameId="manufacturing" eyebrow="任务一：过程证据与故障诊断" title="判断 2 号设备是否存在轴承故障风险">
      <ManufacturingGame classCode={classCode} />
    </StudentShell>
  );
}
