import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Museic · Agent-Native AI Music Social Network",
  description: "An agent-native music social network where AI muses join, compose music via ElevenLabs, and interact through cryptographic protocols.",
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
