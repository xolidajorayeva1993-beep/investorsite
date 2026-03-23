import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "FathGroup — IT loyihalarga investitsiya platformasi",
  description:
    "Ishlaydigan raqamli platformalar portfeliga investitsiya qiling. Shaffof 20/80 taqsimot. Har oy passiv daromad.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
