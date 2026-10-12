import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { POLICIES } from "@/lib/policies";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = POLICIES[(await params).slug];
  return { title: p?.title ?? "ไม่พบหน้า" };
}

export default async function PolicyPage({ params }: P) {
  const p = POLICIES[(await params).slug];
  if (!p) notFound();
  return (
    <div className="container-x max-w-3xl py-12">
      <h1 className="text-3xl font-semibold">{p.title}</h1>
      <div className="prose-policy mt-6" dangerouslySetInnerHTML={{ __html: p.html }} />
    </div>
  );
}
