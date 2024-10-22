import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import NavBar from "@/components/layout/NavBar";
import Container from "@/components/layout/Container";
import SocketProvider from "@/providers/SocketProvider";
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Vidchat",
  description: "video call",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body
        className={cn(`${geistSans.variable} ${geistMono.variable} antialiased relative`)}
      >
        <SocketProvider>
        <main className="flex flex-col min-h-screen bg-secondary">     
        <NavBar />
        <Container>
         {children}
        </Container>
        </main>
        </SocketProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
