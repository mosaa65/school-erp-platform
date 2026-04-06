import type { Metadata } from "next";
import { Almarai, Cairo, JetBrains_Mono, Noto_Kufi_Arabic, Tajawal } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  variable: "--font-tajawal",
  weight: ["400", "500", "700", "800"],
  display: "swap",
});
const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  variable: "--font-noto-kufi-arabic",
  weight: ["400", "500", "700"],
  display: "swap",
});
const almarai = Almarai({
  subsets: ["arabic"],
  variable: "--font-almarai",
  weight: ["300", "400", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "School ERP Web",
  description: "School ERP frontend foundation with isolated web server",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${jetbrainsMono.variable} ${tajawal.variable} ${notoKufiArabic.variable} ${almarai.variable}`}
    >
      <body className="min-h-screen">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}




