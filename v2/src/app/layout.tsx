import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Montserrat, Plus_Jakarta_Sans } from "next/font/google";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ContactFab } from "@/components/layout/ContactFab";
import { ScrollReveal } from "@/components/layout/ScrollReveal";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { CookieConsent } from "@/components/layout/CookieConsent";
import { GoldenCloverEffect } from "@/components/ui/GoldenCloverEffect";
import { LivePurchaseToast } from "@/components/ui/LivePurchaseToast";
import { ReferralCapture } from "@/components/referral/ReferralCapture";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#030a05",
};

import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Suertudos Premios | MOTORRAD CORSA R150 0km 2026",
    template: "%s | Suertu2s",
  },
  description:
    "Adquiere ilustraciones digitales del sur de Chile y participa por la MOTORRAD CORSA R150 0km 2026. Pago 100% seguro con Flow.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: siteUrl,
    siteName: "Suertu2s",
    title: "Suertudos Premios | MOTORRAD CORSA R150 0km 2026",
    description:
      "Ilustraciones del sur de Chile + participación por una MOTORRAD CORSA R150 0km 2026.",
    images: [{ url: "/suertu2s_moto_hero.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Suertu2s — MOTORRAD CORSA R150 2026",
    description:
      "Compra ilustraciones digitales y participa por la moto 0km.",
    images: ["/suertu2s_moto_hero.jpg"],
  },
  icons: {
    icon: "/favicon/trebol.webp",
    apple: "/favicon/trebol.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${montserrat.variable} scroll-smooth`}
    >
      <body className="min-h-screen flex flex-col font-sans antialiased bg-brand-bg text-brand-cream">
        <div aria-hidden="true" className="ambient-bg" />
        <div aria-hidden="true" className="noise-overlay" />
        <ScrollReveal />
        <SmoothScroll />
        <Suspense fallback={null}>
          <ReferralCapture />
        </Suspense>
        <DemoBanner />
        <Header />
        {children}
        <Footer />
        <ContactFab />
        <LivePurchaseToast />
        <CookieConsent />
        <GoldenCloverEffect />
      </body>
    </html>
  );
}
