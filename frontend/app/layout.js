import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Email Threat Intelligence & Forensic Platform",
  description: "Interactive email forensic analysis, telemetry hops, and IOC graph exploration",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full bg-canvas text-ink antialiased`}
    >
      <body className="min-h-full bg-canvas text-ink">
        <div className="flex min-h-full">
          <Sidebar />
          <main className="min-w-0 flex-1 bg-canvas">{children}</main>
        </div>
      </body>
    </html>
  );
}
