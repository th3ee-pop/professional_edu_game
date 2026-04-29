import type { Metadata, Viewport } from "next";
import { EventFlush } from "@/components/EventFlush";
import "./globals.css";

export const metadata: Metadata = {
  title: "职业教育学习分析 H5",
  description: "数据驱动教学分析课堂互动系统"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f5f1e8"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <EventFlush />
        {children}
      </body>
    </html>
  );
}
