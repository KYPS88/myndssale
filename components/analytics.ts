"use client";

// ส่ง event ไป GA4 / Meta Pixel เฉพาะเมื่อผู้ใช้ยอมรับคุกกี้วิเคราะห์/การตลาดแล้ว
type Params = {
  value?: number;
  currency?: string;
  transaction_id?: string;
  shipping?: number;
  coupon?: string;
  items?: { item_id: string; item_name: string; price: number; quantity: number; item_variant?: string }[];
  search_term?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const CONSENT_KEY = "mynds_consent_v1";
export type Consent = "all" | "necessary";

export function getConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === "all" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

const META_EVENT: Record<string, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  search: "Search",
};

export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined" || getConsent() !== "all") return;
  const p = { currency: "THB", ...params };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ecommerce: p });
  window.gtag?.("event", event, p);
  const meta = META_EVENT[event];
  if (meta && window.fbq) {
    const data = {
      value: p.value,
      currency: p.currency,
      content_type: "product",
      content_ids: p.items?.map((i) => i.item_id),
      search_string: p.search_term,
    };
    // eventID = transaction_id ใช้ dedupe กับ Conversions API ฝั่ง server
    window.fbq("track", meta, data, p.transaction_id ? { eventID: p.transaction_id } : undefined);
  }
}
