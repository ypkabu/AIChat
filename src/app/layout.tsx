import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/AppProviders";

export const metadata: Metadata = {
  title: "Story Roleplay Studio",
  description: "Personal story creation and AI roleplay PWA.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Roleplay"
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icons/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#101216"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
