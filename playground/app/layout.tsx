import type { Metadata } from "next";
import NavAside from "./components/NavAside";
import "./globals.css";

export const metadata: Metadata = {
  title: "ByPilot SDK Playground",
  description: "Business Signup SDK Test Environment",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <NavAside />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
