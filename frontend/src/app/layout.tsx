import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeSettingsProvider } from "@/components/providers/theme-settings-provider";
import { LegacyNavBridge } from "@/components/ui/legacy-nav-bridge";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumiere IoT",
  description: "Nocturne Protocol frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      className={`${inter.variable} ${manrope.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="min-h-full">
        <ThemeSettingsProvider>
          <LegacyNavBridge />
          {children}
        </ThemeSettingsProvider>
      </body>
    </html>
  );
}
