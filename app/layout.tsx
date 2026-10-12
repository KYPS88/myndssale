import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { getSettings } from "@/lib/db";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Tracking } from "@/components/Tracking";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} — ${site.tagline} | เสื้อผ้าใส่สบาย ไม่ร้อน`, template: `%s | ${site.name}` },
  description:
    "Mynds (มายด์) แบรนด์เสื้อผ้าสำหรับอากาศร้อน ผ้า Ultra Cool เย็นตั้งแต่ครั้งแรกที่สัมผัส เสื้อยืด เสื้อโปโล แขนยาว ผู้ชาย ผู้หญิง เด็ก ไซซ์ XS–6XL",
  icons: { icon: "/favicon.svg" },
  openGraph: { siteName: site.name, locale: "th_TH", type: "website" },
};

export const viewport: Viewport = { themeColor: "#0e1a24", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen font-sans">
        <CartProvider>
          <Header announcement={settings.announcement} />
          <main>{children}</main>
          <Footer />
          <CartDrawer freeShippingMin={Number(settings.free_shipping_min) || 0} />
        </CartProvider>
        <Tracking />
      </body>
    </html>
  );
}
