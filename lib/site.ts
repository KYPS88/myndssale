// ข้อมูลแบรนด์จากชีต 01_Brief_แบรนด์ / 05_ระบบและการเชื่อมต่อ
export const site = {
  name: "Mynds",
  nameTh: "มายด์",
  tagline: "Hot Weather Apparel",
  positioning:
    "แบรนด์ Hot Weather Apparel อันดับหนึ่งของโลก ที่เริ่มต้นจากประเทศไทย",
  sellingPoints: [
    { title: "เย็นตั้งแต่ครั้งแรกที่สัมผัส", body: "ผ้า Ultra Cool ระบายความร้อนได้ดี ใส่สบายแม้วันที่ร้อนที่สุด" },
    { title: "ราคาจับต้องได้", body: "คุณภาพระดับพรีเมียมในราคาที่ใส่ได้ทุกวัน" },
    { title: "ไซซ์ครบ XS–6XL", body: "ทรงตรง ใส่ได้ทุกรูปร่าง มีทั้งผู้ชาย ผู้หญิง และเด็ก" },
  ],
  company: {
    name: "บริษัท มายด์ โปรดักส์ จำกัด",
    taxId: "0105567220676",
    address:
      "เลขที่ 359/136 มบ.โกลเด้น นีโอ 2 บางแค ซอยกาญจนาภิเษก 005/1 แขวงหลักสอง เขตบางแค กรุงเทพฯ 10160",
  },
  contact: {
    lineId: "@693ppazy",
    lineUrl: "https://line.me/R/ti/p/@693ppazy",
    hours: "ทุกวัน 09:00–18:00 น.",
  },
  currency: "THB",
  locale: "th-TH",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
};

export function formatBaht(n: number): string {
  return "฿" + n.toLocaleString("th-TH", { maximumFractionDigits: 2 });
}
