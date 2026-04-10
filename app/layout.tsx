import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const DESCRIPTION =
  "Portale interno per la gestione di collaboratori, compensi, rimborsi e documenti di Testbusters e Peer4Med.";

export const viewport: Viewport = {
  themeColor: "#FE3200",
};

export const metadata: Metadata = {
  title: "Staff Manager",
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Staff Manager",
    title: "Staff Manager",
    description: DESCRIPTION,
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "Staff Manager",
    description: DESCRIPTION,
  },
  appleWebApp: {
    title: "Staff Manager",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
