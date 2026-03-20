import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoragePersist } from "./components/storage-persist";

export const metadata: Metadata = {
  title: "LumbungData",
  description: "Platform data pertanian offline-first untuk petani kecil Indonesia",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16a34a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <StoragePersist />
        {children}
      </body>
    </html>
  );
}
