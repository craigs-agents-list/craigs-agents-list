/* Tests for the dependency-free renderer in js/markdown.js.
 * The file is a browser IIFE that assigns window.MD; we run it with a fake
 * window to get the same render()/inline() the site uses. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const src = await readFile(join(HERE, "..", "js", "markdown.js"), "utf8");
const win = {};
new Function("window", src)(win);
const MD = win.MD;

test("renders headings, bold, and lists", () => {
  assert.match(MD.render("# Title"), /<h1>Title<\/h1>/);
  assert.match(MD.render("**strong**"), /<strong>strong<\/strong>/);
  const list = MD.render("- one\n- two");
  assert.match(list, /<ul>/);
  assert.match(list, /<li>one<\/li>/);
});

test("escapes raw HTML", () => {
  assert.match(MD.render("<script>alert(1)</script>"), /&lt;script&gt;/);
  assert.doesNotMatch(MD.render("<script>alert(1)</script>"), /<script>/);
});

test("renders safe links as anchors", () => {
  const html = MD.render("[example](https://example.com)");
  assert.match(html, /<a href="https:\/\/example\.com"[^>]*>example<\/a>/);
});

test("neutralizes javascript: links to plain text", () => {
  const html = MD.render("[click me](javascript:alert(1))");
  assert.doesNotMatch(html, /<a /);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /click me/);
});

test("neutralizes data: image URLs to alt text", () => {
  const html = MD.render("![evil](data:text/html,<script>alert(1)</script>)");
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /data:text\/html/);
  assert.match(html, /evil/);
});

test("allows relative and in-page links", () => {
  assert.match(MD.render("[raw](posts/gigs/x.md)"), /<a href="posts\/gigs\/x\.md">raw<\/a>/);
  assert.match(MD.render("[home](#/)"), /<a href="#\/">home<\/a>/);
});
