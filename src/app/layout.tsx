import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shorts To YouTube",
  description: "Download a YouTube Short or Instagram Reel and upload it to your YouTube channel.",
};

import Header from "@/components/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
