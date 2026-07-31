#!/usr/bin/env node
/* validate.mjs - lint every listing against the schema before it reaches the board.
 *
 * ROLE:    the gate. CI and the listing-autopilot run this on every PR; it exits
 *          non-zero if any listing is malformed, so a bad .md can never merge.
 * INPUTS:  posts/**\/*.md and data/categories.json (via scripts/lib.mjs).
 * OUTPUTS: a human-readable report on stdout and an exit code (0 = clean).
 *
 * Usage:
 *   node scripts/validate.mjs              # validate listings
 *   node scripts/validate.mjs --generated  # also fail if generated files are stale
 *
 * Zero dependencies; Node 18+.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  ROOT, POSTS_DIR, loadCategories, readListing, walk,
  ALLOWED_TYPES, SECURITY_SIGNAL, SECURITY_TRIGGER,
} from "./lib.mjs";
import { collectBoard, renderArtifacts, GENERATED_FILES } from "./build.mjs";

export const REQUIRED_FIELDS = ["id", "title", "section", "subcat", "type", "region", "date"];
export const ALLOWED_STATUSES = ["open", "filled", "closed"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Strict slug: lowercase alphanumerics + internal hyphens, 1-80 chars, no
// leading/trailing hyphen. Anything outside this can't reach the UI as an id.
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,78}[a-z0-9])?$/;
// ISO datetime (the `generated` stamp). Used to blank timestamps before comparing
// generated files, so a fresh build's new timestamp is not mistaken for staleness.
const ISO_STAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g;

// A URL is safe to render if it is an in-page anchor, an http(s)/mailto link, or
// a scheme-less relative path. Anything with another scheme (javascript:, data:,
// file:, ...) is rejected. This mirrors the allowlist in js/markdown.js so the
// validator and the renderer agree on what can appear in a listing body.
export function isSafeUrl(url) {
  const u = String(url).trim();
  if (u === "" || u.startsWith("#")) return true;
  if (/^(https?:|mailto:)/i.test(u)) return true;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return false; // some other scheme
  return true; // no scheme -> relative path
}

// Pull every link/image target out of a markdown body for URL-scheme checking.
export function extractUrls(md) {
  const urls = [];
  const linkOrImage = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = linkOrImage.exec(md))) urls.push(m[1]);
  return urls;
}

// Precompute the allowed-value sets from the taxonomy. `cats` is categories.json.
export function buildContext(cats) {
  const site = cats.site || {};
  const sections = cats.sections || [];
  return {
    sectionById: new Map(sections.map((s) => [s.id, s])),
    regions: new Set(site.regions || []),
    rails: new Set(site.rails || []),
    contactKinds: new Set(site.contact_kinds || []),
    types: new Set(ALLOWED_TYPES),
  };
}

// Validate one listing against the schema. Returns { errors, warnings } as
// message arrays (no path prefix). Cross-listing checks (id uniqueness) and the
// stale-generated-files check live in main(); everything here is per-listing and
// pure, so tests can call it with fixture objects.
export function validateListing({ data, body, raw, path, hasFrontmatter }, ctx) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  if (!hasFrontmatter) { err("no YAML frontmatter block (--- ... ---)"); return { errors, warnings }; }

  // required fields
  for (const f of REQUIRED_FIELDS) {
    if (data[f] === undefined || data[f] === "") err(`missing required field "${f}"`);
  }

  // id must equal the filename AND be a strict slug. The id (and the filename it
  // mirrors) flows into HTML attributes and URLs in the UI, so constraining it to
  // [a-z0-9-] here is the load-bearing defense against attribute/markup injection
  // via a crafted filename that would otherwise auto-merge.
  const fileId = path.split("/").pop().replace(/\.md$/, "");
  if (data.id && data.id !== fileId) err(`id "${data.id}" != filename "${fileId}.md"`);
  const idToCheck = data.id || fileId;
  if (idToCheck && !SLUG_RE.test(String(idToCheck))) {
    err(`id "${idToCheck}" must be a slug: lowercase a-z, 0-9 and hyphens, e.g. my-listing`);
  }

  // file must live under posts/<section>/
  const folder = path.split("/")[1];
  if (data.section && folder && folder !== data.section) {
    err(`in posts/${folder}/ but section is "${data.section}" - move it to posts/${data.section}/`);
  }

  // section + subcat must exist in the taxonomy
  const sec = data.section ? ctx.sectionById.get(data.section) : null;
  if (data.section && !sec) {
    err(`unknown section "${data.section}"`);
  } else if (sec && data.subcat) {
    const subIds = new Set((sec.subcats || []).map((sc) => sc.id));
    if (!subIds.has(data.subcat)) err(`unknown subcat "${data.subcat}" in section "${data.section}"`);
  }

  // enumerated fields
  if (data.type && !ctx.types.has(data.type)) err(`invalid type "${data.type}" (allowed: ${ALLOWED_TYPES.join(", ")})`);
  if (data.status && !ALLOWED_STATUSES.includes(data.status)) {
    err(`invalid status "${data.status}" (allowed: ${ALLOWED_STATUSES.join(", ")})`);
  }
  if (data.region && !ctx.regions.has(data.region)) err(`unknown region "${data.region}"`);
  if (data.contact_kind && !ctx.contactKinds.has(data.contact_kind)) {
    warn(`unusual contact_kind "${data.contact_kind}"`);
  }

  // rails must be a subset of the site's accepted rails
  const postRails = Array.isArray(data.rails) ? data.rails : data.rails ? [data.rails] : [];
  for (const r of postRails) if (!ctx.rails.has(r)) err(`unknown payment rail "${r}"`);

  // date format
  if (data.date && !DATE_RE.test(String(data.date))) err(`date "${data.date}" is not YYYY-MM-DD`);

  // security guardrail (heuristic): a listing in a security subcat OR one that
  // mentions offensive-security work anywhere must show authorization/defensive
  // framing. Checking the title/tags/body (not just the subcat) closes the
  // "post red-team work under a non-security subcat" bypass.
  const securityRelevant =
    data.subcat === "security" ||
    SECURITY_TRIGGER.test(`${data.title || ""} ${(Array.isArray(data.tags) ? data.tags.join(" ") : "")} ${body}`);
  if (securityRelevant && !SECURITY_SIGNAL.test(raw)) {
    err("security/offensive listing must state authorization or defensive/own-system scope (see AGENTS.md §6)");
  }

  // no unsafe URL schemes in the body (mirrors the renderer's allowlist)
  for (const url of extractUrls(body)) {
    if (!isSafeUrl(url)) err(`unsafe URL scheme in body: ${url}`);
  }

  return { errors, warnings };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const cats = await loadCategories();
  const ctx = buildContext(cats);

  const files = (await walk(POSTS_DIR)).sort();
  const errors = [];   // blocking; exit 1
  const warnings = []; // informational; exit 0
  const idsSeen = new Map(); // id -> first path that used it

  for (const file of files) {
    const listing = await readListing(file);
    const { path } = listing;
    const res = validateListing(listing, ctx);
    for (const e of res.errors) errors.push(`${path}: ${e}`);
    for (const w of res.warnings) warnings.push(`${path}: ${w}`);

    // cross-listing: id uniqueness across the board
    const id = listing.data.id || path.split("/").pop().replace(/\.md$/, "");
    if (idsSeen.has(id)) errors.push(`${path}: duplicate id "${id}" (also in ${idsSeen.get(id)})`);
    else idsSeen.set(id, path);
  }

  // ---------- optional: are the generated files stale? ----------
  if (args.has("--generated")) {
    const board = await collectBoard();
    const expected = renderArtifacts({ ...board, generated: "STAMP" });
    const blank = (s) => s.replace(ISO_STAMP_RE, "STAMP");
    for (const rel of GENERATED_FILES) {
      let onDisk = "";
      try { onDisk = await readFile(join(ROOT, rel), "utf8"); }
      catch { errors.push(`${rel}: missing - run npm run build`); continue; }
      if (blank(onDisk) !== blank(expected[rel])) {
        errors.push(`${rel}: out of date - run npm run build and commit the result`);
      }
    }
  }

  // ---------- report ----------
  if (warnings.length) {
    console.log(`warnings (${warnings.length}):`);
    for (const w of warnings) console.log("  ! " + w);
    console.log("");
  }
  if (errors.length) {
    console.error(`FAIL - ${errors.length} error(s) in ${files.length} listings:`);
    for (const e of errors) console.error("  x " + e);
    process.exit(1);
  }
  console.log(`OK - ${files.length} listings valid` + (args.has("--generated") ? ", generated files current" : ""));
}

// Only run when invoked directly (node scripts/validate.mjs), not when imported
// by the test suite — otherwise importing this module would run the whole
// validation and could call process.exit() mid-test. pathToFileURL handles
// paths with spaces/unicode that a raw `file://` concatenation gets wrong.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
