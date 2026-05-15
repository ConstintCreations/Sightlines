import type { Metadata } from "next";
import "./globals.css";
import { Fascinate_Inline, Zain } from 'next/font/google';
import Footer from "@/app/components/footer";
import { ThemeProvider, ThemedAdditions } from "./components/theme";

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
    <html lang="en" suppressHydrationWarning  data-theme="regular">
      <body
        className={`${zain.variable} antialiased min-h-screen flex flex-col`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `
              const theme = localStorage.getItem('theme');
              if (theme) {
                document.documentElement.dataset.theme = theme;
              } else {
                const month = new Date().getMonth();
                if (month === 11) {
                  localStorage.setItem('theme', 'winter'); 
                  document.documentElement.dataset.theme = 'winter';
                } else {
                  localStorage.setItem('theme', 'regular');
                }
              }
            `,
          }}
        />
        <ThemeProvider>
          <ThemedAdditions />
          {children}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
