import type { Metadata } from "next";
import "./globals.css";
import "./structured-workspace.css";
export const metadata: Metadata = {
  title: "BN CRM · Bottle Nexus",
  icons: { icon: { url: "/bottle-nexus-logo.png", type: "image/png" } },
  description:
    "Your relationships, operations, and growth. One connected workspace. Interactive prototype using fictional data.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
