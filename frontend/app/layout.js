import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
      className={`${inter.variable} ${jetbrainsMono.variable} h-full bg-canvas text-ink antialiased font-sans`}
    >
      <body className="min-h-full bg-canvas text-ink font-sans">
        <div className="flex min-h-full">
          <Sidebar />
          <main className="min-w-0 flex-1 bg-canvas">{children}</main>
        </div>
      </body>
    </html>
  );
}
