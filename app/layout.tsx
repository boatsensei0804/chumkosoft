import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import ThemeRegistry from "./theme-registry";
import { getLocale } from "@/lib/i18n/server";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "chumkosoft — ระบบบริหารจัดการโรงเรียน",
  description: "ระบบบริหารจัดการข้อมูลนักเรียน ครู และรายวิชา สำหรับสถานศึกษา",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.ReactNode> {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${plexThai.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
