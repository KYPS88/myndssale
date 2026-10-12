"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_KEY, getConsent, type Consent } from "./analytics";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function Tracking() {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [asked, setAsked] = useState(true);

  useEffect(() => {
    const c = getConsent();
    setConsent(c);
    setAsked(c !== null);
  }, []);

  const choose = (c: Consent) => {
    try {
      localStorage.setItem(CONSENT_KEY, c);
    } catch {}
    setConsent(c);
    setAsked(true);
  };

  return (
    <>
      {consent === "all" && GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {consent === "all" && PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      )}
      {!asked && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
          <div className="card mx-auto flex max-w-3xl flex-col gap-3 p-4 shadow-lg sm:flex-row sm:items-center">
            <p className="flex-1 text-sm text-ink/80">
              เราใช้คุกกี้เพื่อให้เว็บไซต์ทำงานได้ และ (เมื่อคุณยินยอม) เพื่อวิเคราะห์การใช้งานและปรับปรุงโฆษณา อ่าน{" "}
              <Link href="/policies/cookies" className="underline">นโยบายคุกกี้</Link>
            </p>
            <div className="flex gap-2">
              <button className="btn-outline" onClick={() => choose("necessary")}>เฉพาะที่จำเป็น</button>
              <button className="btn-primary" onClick={() => choose("all")}>ยอมรับทั้งหมด</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
