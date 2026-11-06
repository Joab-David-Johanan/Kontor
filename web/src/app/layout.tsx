import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PLATFORM_NAME } from "@/lib/platform";
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
  // Each page sets its own title; the template adds " · Kontor" to it.
  title: { default: PLATFORM_NAME, template: `%s · ${PLATFORM_NAME}` },
  description: `Operator console for the ${PLATFORM_NAME} agentic AI platform`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Each portal's own layout (app/(tenant)/layout.tsx or app/platform/layout.tsx)
          is inserted here as children, with the current page inside it. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
