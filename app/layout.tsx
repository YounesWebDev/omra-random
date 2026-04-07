import type { Metadata } from "next";
import {
  Bodoni_Moda,
  El_Messiri,
  Geist_Mono,
  Inter,
  Merriweather,
  Noto_Nastaliq_Urdu,
} from "next/font/google";
import "./globals.css";

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni-moda",
});

const elMessiri = El_Messiri({
  subsets: ["arabic", "latin"],
  variable: "--font-el-messiri",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  variable: "--font-merriweather",
  weight: ["300", "400", "700", "900"],
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  variable: "--font-noto-nastaliq-urdu",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "اختيار عشوائي للعمرة | Umrah Random Selector",
  description: "تطبيق اختيار الأسماء العشوائي للعمرة",
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
      className={`${bodoniModa.variable} ${elMessiri.variable} ${inter.variable} ${merriweather.variable} ${notoNastaliqUrdu.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
