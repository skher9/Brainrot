import type { Metadata } from "next";
import { Orbitron, Chakra_Petch, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const chakraPetch = Chakra_Petch({
  variable: "--font-tac",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Brainrot — CS felt in the fingers",
  description: "DSA patterns. System design. Debugging. Six stages of pure pattern recognition across every concept that runs the modern stack.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${orbitron.variable} ${chakraPetch.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
