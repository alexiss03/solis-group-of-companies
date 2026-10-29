import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Solis — Company Management",
  description: "Private company, supplier, employee, and inventory management.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
