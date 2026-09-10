import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "../components/Sidebar";
import HelpButton from "../components/HelpButton";

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
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full bg-canvas text-ink antialiased font-sans`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const t = sessionStorage.getItem('settings_displayTheme') || 'dark';
                  let isDark = true;
                  if (t === 'light') isDark = false;
                  else if (t === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-canvas text-ink font-sans">
        <div className="flex min-h-full">
          <Sidebar />
          <main className="min-w-0 flex-1 bg-canvas">{children}</main>
        </div>
        <HelpButton />
      </body>
    </html>
  );
}
