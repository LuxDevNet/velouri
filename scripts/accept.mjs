#!/usr/bin/env node
// accept.mjs — local acceptance check. Requires no deployed edge function
// and no Cloudflare worker. Two parts:
//
// 1. Spawns Deno to run scripts/_accept-harness.ts, which imports the real
//    router.ts / store.ts modules and exercises them in memory-fallback
//    mode (no SUPABASE_SERVICE_ROLE_KEY). Asserts GET /v1 shape, the
//    store.ts write guard, gallery/search/cron/MCP behavior.
// 2. Greps sites/www and supabase/functions for the CODICE project ref and
//    anything that looks like a live secret, matching program gate 3.

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");

function log(line) {
  process.stdout.write(`${line}\n`);
}

function fail(message) {
  process.stderr.write(`FAIL: ${message}\n`);
  process.exitCode = 1;
}

// ---------------------------------------------------------------------------
// Part 1 — router + store checks via Deno
// ---------------------------------------------------------------------------

function runHarness() {
  const harnessPath = join(__dirname, "_accept-harness.ts");
  const deno = spawnSync(
    "deno",
    ["run", "--allow-net", "--allow-env", harnessPath],
    { cwd: repoRoot, encoding: "utf-8" },
  );

  if (deno.error) {
    fail(`could not spawn deno (${deno.error.message}). Install Deno to run this check.`);
    return null;
  }

  if (deno.status !== 0) {
    fail(`accept harness exited ${deno.status}`);
    if (deno.stdout) log(deno.stdout.trim());
    if (deno.stderr) log(deno.stderr.trim());
    return null;
  }

  const lines = deno.stdout.trim().split("\n").filter(Boolean);
  const lastLine = lines[lines.length - 1];
  try {
    const parsed = JSON.parse(lastLine);
    if (!parsed.ok) {
      fail("accept harness reported ok=false");
      return null;
    }
    return parsed.results;
  } catch (err) {
    fail(`could not parse harness output as JSON: ${err.message}`);
    log(deno.stdout);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Part 2 — brand / secret grep (program gate 3)
// ---------------------------------------------------------------------------

const FORBIDDEN_PATTERNS = [
  { name: "CODICE project ref", re: /rktwcqzmwkitjwnvtusc/ },
  { name: "likely live JWT secret", re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

const SCAN_DIRS = [join(repoRoot, "sites", "www", "src"), join(repoRoot, "supabase", "functions", "agna", "src")];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function runBrandGrep() {
  let clean = true;
  for (const dir of SCAN_DIRS) {
    let files;
    try {
      files = walk(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      const text = readFileSync(file, "utf-8");
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.re.test(text)) {
          fail(`${pattern.name} found in ${file}`);
          clean = false;
        }
      }
    }
  }
  return clean;
}

// ---------------------------------------------------------------------------

log("== agna accept ==");
log("-- router/store harness (deno) --");
const results = runHarness();
if (results) {
  log(`health: ${JSON.stringify(results.health)}`);
  log(`writeGuard: ${results.writeGuard}`);
  log(`filters: ${JSON.stringify(results.filters.filters)}`);
  log(`sources: ${JSON.stringify(results.sources.sources)}`);
  log(`search items: ${results.search.itemCount}`);
  log(`gallery lane (nature) items: ${results.galleryLane.itemCount}`);
  log(`gallery items: ${results.gallery.itemCount}`);
  log(`cron list: ${JSON.stringify(results.cronList)}`);
  log(`cron run: ${JSON.stringify(results.cronRun)}`);
  log(`mcp tools: ${JSON.stringify(results.mcpTools)}`);
}

log("-- brand / secret grep --");
const grepClean = runBrandGrep();
if (grepClean) log("no CODICE ref or live-secret pattern found in sites/www or the edge function");

if (process.exitCode) {
  log("== RESULT: FAIL ==");
  process.exit(process.exitCode);
} else {
  log("== RESULT: PASS ==");
}
