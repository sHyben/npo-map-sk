import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NPO Map SK - Mapa neziskových organizácií na Slovensku",
  description:
    "Interaktívna mapa neziskových organizácií na Slovensku. Nájdite, sledujte a pomáhajte organizáciám vo vašom okolí.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk">
      <body className={`${geistSans.variable} antialiased`}>
        <SessionProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
