import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopBar } from "@/app/components/top-bar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PatchMap",
  description: "Enterprise pull request walkthroughs with grouped diff context.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInitScript = `
    (() => {
      try {
        const stored = window.localStorage.getItem("pm-theme");
        const theme = stored === "light" || stored === "dark"
          ? stored
          : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.dataset.theme = theme;
      } catch {}
    })();
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TopBar />
        {children}
      </body>
    </html>
  );
}
