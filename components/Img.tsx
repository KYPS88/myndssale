"use client";

import { useEffect, useRef, useState } from "react";

type Props = Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> & { src?: string | null; hideOnError?: boolean };

/** <img> ที่สลับเป็นรูป placeholder อัตโนมัติถ้าโหลดรูปจากลิงก์ภายนอกไม่ได้ */
export function Img({ src, alt, hideOnError, ...rest }: Props) {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState<string | null>(null);
  // รูปที่โหลดพังก่อน hydrate จะไม่ยิง onError ให้ React — ตรวจซ้ำหลัง mount
  useEffect(() => {
    const el = ref.current;
    if (src && el && el.complete && el.naturalWidth === 0) setFailed(src);
  }, [src]);
  const broken = !src || failed === src;
  if (broken && hideOnError) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={broken ? "/placeholder.svg" : src} alt={alt ?? ""} onError={() => src && setFailed(src)} {...rest} />;
}
