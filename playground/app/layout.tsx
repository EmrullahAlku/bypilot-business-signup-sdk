import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByPilot SDK Test",
  description: "Business Signup SDK Test Environment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
