import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Insurer Product Proof Platform (IPPP)",
  description: "보험사 상품·위험률 검증 의뢰·결과·피드백 통합 관리 플랫폼 — Insurer Product Proof Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
