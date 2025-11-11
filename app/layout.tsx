/**
 * Feature: Update favicon to project logo
 * Purpose: Set the site favicon to use the AdPilot logomark
 * References:
 *  - Next.js Metadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#icons
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { CampaignProvider } from "@/lib/context/campaign-context";
import { SonnerToaster } from "@/components/sonner-toaster";
import Script from "next/script";
import { COMPANY_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: `${COMPANY_NAME} - Create Meta Ads with AI`,
  description: "Create Facebook and Instagram ads with AI-generated content",
  icons: "/AdPilot-Logomark.svg",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
        <Script
          id="facebook-sdk-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId: '${process.env.NEXT_PUBLIC_FB_APP_ID}',
                  autoLogAppEvents: true,
                  cookie: true,
                  xfbml: true,
                  // IMPORTANT: ensure NEXT_PUBLIC_FB_GRAPH_VERSION is set to a supported Graph version
                  version: '${process.env.NEXT_PUBLIC_FB_GRAPH_VERSION}'
                });
                FB.AppEvents.logPageView();
              };
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="beforeInteractive" />
        <Script 
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          async
          defer
          crossOrigin="anonymous"
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <CampaignProvider>
              {children}
              <SonnerToaster />
            </CampaignProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
