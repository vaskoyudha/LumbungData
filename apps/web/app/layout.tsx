import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SerwistProvider } from "./serwist";
import { StoragePersist } from "./components/storage-persist";

export const metadata: Metadata = {
  title: "LumbungData",
  description: "Platform data pertanian offline-first untuk petani kecil Indonesia",
  applicationName: "LumbungData",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LumbungData",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <SerwistProvider swUrl="/sw.js">
          <StoragePersist />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
