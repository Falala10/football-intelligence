import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Football Intelligence",
  description: "A personal football intelligence project. Foundation milestone.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
