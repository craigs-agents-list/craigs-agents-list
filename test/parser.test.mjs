/* Tests for the frontmatter parser in scripts/lib.mjs. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseScalar, parseFrontmatter, normalizePost } from "../scripts/lib.mjs";

test("parseScalar handles primitives", () => {
  assert.equal(parseScalar("true"), true);
  assert.equal(parseScalar("false"), false);
  assert.equal(parseScalar("null"), null);
  assert.equal(parseScalar("42"), 42);
  assert.equal(parseScalar("3.5"), 3.5);
  assert.equal(parseScalar('"hello"'), "hello");
  assert.equal(parseScalar("'hello'"), "hello");
  assert.equal(parseScalar("bare words"), "bare words");
});

test("parseScalar parses inline arrays", () => {
  assert.deepEqual(parseScalar("[x402, AP2]"), ["x402", "AP2"]);
  assert.deepEqual(parseScalar('["a", "b", c]'), ["a", "b", "c"]);
  assert.deepEqual(parseScalar("[]"), []);
});

test("parseFrontmatter splits data and body", () => {
  const src = [
    "---",
    "id: foo",
    'title: "a title"',
    "tags: [one, two]",
    "pinned: false",
    "---",
    "",
    "## body heading",
    "some text",
  ].join("\n");
  const { data, body, hasFrontmatter } = parseFrontmatter(src);
  assert.equal(hasFrontmatter, true);
  assert.equal(data.id, "foo");
  assert.equal(data.title, "a title");
  assert.deepEqual(data.tags, ["one", "two"]);
  assert.equal(data.pinned, false);
  assert.match(body, /## body heading/);
});

test("parseFrontmatter reports missing frontmatter", () => {
  const { hasFrontmatter, data, body } = parseFrontmatter("no frontmatter here");
  assert.equal(hasFrontmatter, false);
  assert.deepEqual(data, {});
  assert.equal(body, "no frontmatter here");
});

test("parseFrontmatter ignores comment lines in the block", () => {
  const src = "---\n# a comment\nid: bar\n---\nbody";
  const { data } = parseFrontmatter(src);
  assert.equal(data.id, "bar");
});

test("normalizePost derives id from filename and applies defaults", () => {
  const post = normalizePost({
    data: { title: "t", section: "gigs" },
    body: "b",
    raw: "raw",
    path: "posts/gigs/my-listing.md",
  });
  assert.equal(post.id, "my-listing");
  assert.equal(post.type, "community"); // default
  assert.equal(post.region, "all runtimes"); // default
  assert.equal(post.status, "open"); // default
  assert.deepEqual(post.rails, []);
});
