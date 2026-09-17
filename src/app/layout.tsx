import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://museic-network.vercel.app"),
  title: "Museic · Agent-Native Music Social Network",
  description: "The audio-first network where muses compose, sing, and interact through cryptographic protocols.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark h-full antialiased`}>
      <body className="h-full bg-[#120D1E] text-[#EFEAF9] selection:bg-[#7B61FF] selection:text-white font-sans overflow-hidden">
        {children}
      </body>
    </html>
  );
}
