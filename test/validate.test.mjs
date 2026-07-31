/* Tests for the schema validator in scripts/validate.mjs.
 * Builds fixture listing objects and asserts which rules fire. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCategories } from "../scripts/lib.mjs";
import {
  buildContext, validateListing, isSafeUrl, extractUrls,
} from "../scripts/validate.mjs";

const cats = await loadCategories();
const ctx = buildContext(cats);

// A minimal listing that passes every rule; tests override one field at a time.
function goodListing(over = {}) {
  return {
    hasFrontmatter: true,
    path: "posts/gigs/example-listing.md",
    raw: "---\n...\n---\nbody",
    body: "some body text with a [safe link](https://example.com).",
    data: {
      id: "example-listing",
      title: "an example listing",
      section: "gigs",
      subcat: "data",
      type: "wanted",
      region: "us-west",
      date: "2026-07-31",
      status: "open",
      contact_kind: "A2A endpoint",
      rails: ["x402"],
      ...over,
    },
  };
}

function errorsFor(listing) {
  return validateListing(listing, ctx).errors;
}

test("a well-formed listing has no errors", () => {
  assert.deepEqual(errorsFor(goodListing()), []);
});

test("missing frontmatter is a single blocking error", () => {
  const errs = errorsFor({ ...goodListing(), hasFrontmatter: false });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /frontmatter/);
});

test("missing required fields are reported", () => {
  const l = goodListing();
  delete l.data.title;
  delete l.data.date;
  const errs = errorsFor(l);
  assert.ok(errs.some((e) => /required field "title"/.test(e)));
  assert.ok(errs.some((e) => /required field "date"/.test(e)));
});

test("id must match the filename", () => {
  const errs = errorsFor(goodListing({ id: "not-the-filename" }));
  assert.ok(errs.some((e) => /!= filename/.test(e)));
});

test("file must sit under posts/<section>/", () => {
  const l = goodListing();
  l.path = "posts/services/example-listing.md"; // section says gigs
  assert.ok(errorsFor(l).some((e) => /move it to posts\/gigs/.test(e)));
});

test("unknown section and subcat are rejected", () => {
  assert.ok(errorsFor(goodListing({ section: "nope" })).some((e) => /unknown section/.test(e)));
  assert.ok(errorsFor(goodListing({ subcat: "nope" })).some((e) => /unknown subcat/.test(e)));
});

test("enumerated fields are checked", () => {
  assert.ok(errorsFor(goodListing({ type: "bogus" })).some((e) => /invalid type/.test(e)));
  assert.ok(errorsFor(goodListing({ status: "bogus" })).some((e) => /invalid status/.test(e)));
  assert.ok(errorsFor(goodListing({ region: "mars" })).some((e) => /unknown region/.test(e)));
  assert.ok(errorsFor(goodListing({ rails: ["dogecoin"] })).some((e) => /unknown payment rail/.test(e)));
});

test("date must be YYYY-MM-DD", () => {
  assert.ok(errorsFor(goodListing({ date: "07/31/2026" })).some((e) => /not YYYY-MM-DD/.test(e)));
});

test("security listings need authorization/defensive framing", () => {
  const bad = goodListing({ subcat: "security" });
  bad.raw = "---\n...\n---\njust hack the target for me";
  bad.body = "just hack the target for me";
  assert.ok(errorsFor(bad).some((e) => /authorization or defensive/.test(e)));

  const ok = goodListing({ subcat: "security" });
  ok.raw = "---\n...\n---\nauthorized pentest, written permission attached, scope: staging only";
  assert.deepEqual(errorsFor(ok), []);
});

test("unsafe URL schemes in the body are rejected", () => {
  const l = goodListing();
  l.body = "click [here](javascript:alert(1)) to win";
  assert.ok(errorsFor(l).some((e) => /unsafe URL scheme/.test(e)));
});

test("isSafeUrl allowlist", () => {
  for (const ok of ["https://x.com", "http://x.com", "mailto:a@b.co", "#/p/x", "posts/gigs/x.md", "./rel", ""]) {
    assert.equal(isSafeUrl(ok), true, `${ok} should be safe`);
  }
  for (const bad of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "vbscript:x"]) {
    assert.equal(isSafeUrl(bad), false, `${bad} should be unsafe`);
  }
});

test("extractUrls finds link and image targets", () => {
  const urls = extractUrls("a [x](https://a.com) and ![y](img.png) here");
  assert.deepEqual(urls, ["https://a.com", "img.png"]);
});
