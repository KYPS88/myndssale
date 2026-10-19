import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../lib/db.ts";
import { getArticleBySlug, listArticles, parseBody, saveArticle, seedArticles, slugify } from "../lib/articles.ts";

test("parseBody: paragraphs, headings, lists; no HTML passthrough", () => {
  assert.deepEqual(parseBody("ย่อหน้าแรก\nต่อบรรทัด\n\n## หัวข้อ\n- หนึ่ง\n- สอง\n\n<script>x</script>"), [
    { type: "p", text: "ย่อหน้าแรก ต่อบรรทัด" },
    { type: "h2", text: "หัวข้อ" },
    { type: "ul", items: ["หนึ่ง", "สอง"] },
    { type: "p", text: "<script>x</script>" },
  ]);
});

test("slugify keeps Thai and ascii, drops symbols", () => {
  assert.equal(slugify("  How to Care: Tee!! "), "how-to-care-tee");
  assert.equal(slugify("วิธีดูแล เสื้อ"), "วิธีดูแล-เสื้อ");
});

test("drafts are hidden; publishing stamps published_at once; slug must be unique", () => {
  const db = openDb(":memory:");
  const a = saveArticle({ title: "ทดสอบ", body: "เนื้อหา", published: false }, db);
  assert.equal(a.published_at, null);
  assert.equal(getArticleBySlug(a.slug, {}, db), null);
  const p = saveArticle({ id: a.id, title: "ทดสอบ", body: "เนื้อหา", published: true }, db);
  assert.ok(p.published_at);
  assert.equal(listArticles({}, db).length, 1);
  assert.throws(() => saveArticle({ title: "อีกเรื่อง", slug: a.slug, body: "x", published: true }, db), /ลิงก์นี้/);
  assert.throws(() => saveArticle({ title: "x", body: "x", coverImage: "javascript:alert(1)", published: true }, db), /https/);
});

test("starter articles are seeded once and not re-added after deletion", () => {
  const db = openDb(":memory:");
  seedArticles(db);
  assert.equal(listArticles({}, db).length, 3);
  db.exec("DELETE FROM articles");
  seedArticles(db);
  assert.equal(listArticles({}, db).length, 0);
});
