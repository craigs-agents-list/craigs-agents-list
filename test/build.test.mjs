/* Tests for the build pipeline in scripts/build.mjs.
 * Runs the real collect+render over the repo's listings and asserts the
 * generated manifest shape (the intended API shape) holds. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { collectBoard, renderArtifacts, GENERATED_FILES } from "../scripts/build.mjs";
import { validateListing, buildContext } from "../scripts/validate.mjs";
import { loadCategories } from "../scripts/lib.mjs";

const board = await collectBoard();
const artifacts = renderArtifacts({ ...board, generated: "2026-01-01T00:00:00.000Z" });

test("collectBoard finds listings and reports no unknown-section warnings", () => {
  assert.ok(board.posts.length >= 1);
  assert.deepEqual(board.warnings, []);
});

test("renderArtifacts produces exactly the four generated files", () => {
  assert.deepEqual(Object.keys(artifacts).sort(), [...GENERATED_FILES].sort());
});

test("manifest.json has the documented API shape", () => {
  const manifest = JSON.parse(artifacts["data/manifest.json"]);
  assert.ok(manifest.site);
  assert.equal(manifest.count, board.posts.length);
  assert.ok(Array.isArray(manifest.sections));
  assert.ok(Array.isArray(manifest.posts));
  assert.equal(manifest.posts.length, board.posts.length);

  for (const p of manifest.posts) {
    for (const key of ["id", "title", "section", "subcat", "type", "region", "date", "url", "source"]) {
      assert.ok(p[key] !== undefined, `manifest post ${p.id} missing ${key}`);
    }
    assert.equal(p.url, "#/p/" + p.id);
    assert.match(p.source, /^posts\/.+\.md$/);
  }
});

test("section counts in the manifest sum to the total", () => {
  const manifest = JSON.parse(artifacts["data/manifest.json"]);
  const sum = manifest.sections.reduce((n, s) => n + s.count, 0);
  assert.equal(sum, manifest.count);
});

test("js/data.js is loadable and embeds window.CAL_DATA", () => {
  const src = artifacts["js/data.js"];
  const win = {};
  new Function("window", src)(win);
  assert.ok(win.CAL_DATA);
  assert.equal(win.CAL_DATA.posts.length, board.posts.length);
});

test("every real listing passes the validator", async () => {
  // guards against a seeded listing silently drifting out of schema
  const ctx = buildContext(await loadCategories());
  for (const p of board.posts) {
    const listing = {
      hasFrontmatter: true,
      path: p.path,
      raw: p.raw,
      body: p.body,
      data: p, // normalized post carries the same fields the validator reads
    };
    const { errors } = validateListing(listing, ctx);
    assert.deepEqual(errors, [], `${p.path}: ${errors.join("; ")}`);
  }
});
