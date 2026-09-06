import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SidebarProfile from "../components/SidebarProfile";
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
          <aside className="sticky top-0 flex h-screen w-[220px] shrink-0 flex-col justify-between border-r border-edge bg-surface px-4 py-5">
            <div>
              <div className="mb-8 text-sm font-medium tracking-wide text-ink">
                Email Forensics
              </div>
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href="#"
                    className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${
                      item.active
                        ? "bg-canvas text-accent"
                        : "text-dim"
                    }`}
                  >
                    <NavIcon name={item.label} />
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
            <div className="pt-4 border-t border-edge/60">
              <SidebarProfile />
            </div>
          </aside>
          <Sidebar />
          <main className="min-w-0 flex-1 bg-canvas">{children}</main>
        </div>
      </body>
    </html>
  );
}
