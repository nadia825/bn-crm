import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BN CRM · Bottle Nexus",
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
