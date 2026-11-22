import type { Metadata, Viewport } from "next";
import { themeBootstrap } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Stash", template: "%s · Stash" },
  description:
    "Save anything. Find everything. A private place for your good finds.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#f9f8f5",
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
