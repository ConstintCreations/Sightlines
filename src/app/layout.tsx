import type { Metadata } from "next";
import "./globals.css";
import { Fascinate_Inline, Zain } from 'next/font/google';
import Footer from "@/app/components/footer";

const fascinateInline = Fascinate_Inline({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-fascinate-inline',
});

const zain = Zain({
  subsets: ['latin'],
  weight: ['400', '700', '800', '900'],
  variable: '--font-zain',
});

export const metadata: Metadata = {
  title: "Sightlines",
  description: "A minimalist logic puzzle web game about vision, heavily inspired by 0h n0 by Q42.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${zain.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
