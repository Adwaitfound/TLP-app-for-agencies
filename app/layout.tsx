import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { DebugConsole } from "@/components/debug-console";
import { GlobalClickTracker } from "@/components/global-click-tracker";
import { ErrorBoundary } from "@/components/error-boundary";
import { GlobalErrorListener } from "@/components/global-error-listener";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Video Production Management App",
  description: "Modern video production project management platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Video Production App",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/icons/icon-192x192.png" }],
    apple: [{ url: "/icons/icon-192x192.png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "VidPro",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ErrorBoundary>
              {children}
              <GlobalClickTracker />
              <GlobalErrorListener />
              <DebugConsole />
            </ErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register service worker only in production to avoid dev caching issues
              (function(){
                try {
                  var isProd = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production') || (window && window.location && !window.location.hostname.includes('localhost'));
                  if (isProd && 'serviceWorker' in navigator) {
                    window.addEventListener('load', () => {
                      navigator.serviceWorker.register('/sw.js').catch(() => {});
                    });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
