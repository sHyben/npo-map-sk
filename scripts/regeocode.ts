/**
 * regeocode.ts
 *
 * Re-geocodes all Organization (and optionally Branch) rows using a
 * self-hosted Nominatim instance (see docker-compose.geocoder.yml).
 * No rate limit applies, so we run many parallel workers for speed.
 *
 * Prerequisites:
 *   docker compose -f docker-compose.geocoder.yml up -d
 *   (First run downloads & indexes Slovakia OSM data – allow 10-20 min.)
 *
 * Usage:
 *   npx tsx scripts/regeocode.ts
 *
 * Optional flags:
 *   --dry-run        Print what would change without writing to DB.
 *   --branches       Also re-geocode Branch records.
 *   --workers=N      Number of parallel geocode workers (default: 16).
 *   --url=http://…   Override the Nominatim base URL.
 */

import "dotenv/config";

const DRY_RUN = process.argv.includes("--dry-run");
const DO_BRANCHES = process.argv.includes("--branches");

const WORKERS = (() => {
  const arg = process.argv.find((a) => a.startsWith("--workers="));
  return arg ? parseInt(arg.split("=")[1], 10) : 16;
})();

const NOMINATIM_URL = (() => {
  const arg = process.argv.find((a) => a.startsWith("--url="));
  return arg ? arg.split("=").slice(1).join("=") : "http://localhost:8088";
})();

// ── Geocoder ──────────────────────────────────────────────────

async function geocode(
  address: string | null,
  city: string | null
): Promise<{ lat: number; lng: number } | null> {
  const queries: string[] = [];
  if (address && city) queries.push(`${address}, ${city}, Slovakia`);
  if (city)            queries.push(`${city}, Slovakia`);
  if (address)         queries.push(`${address}, Slovakia`);

  for (const q of queries) {
    const url =
      `${NOMINATIM_URL}/search?` +
      new URLSearchParams({ q, format: "json", limit: "1", countrycodes: "sk" });

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) continue;

      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {
      // timeout or network error – try next query variant
    }
  }

  return null;
}

// ── Worker pool ───────────────────────────────────────────────

type Job = { id: string; address: string | null; city: string | null };
type Result = { id: string; lat: number; lng: number } | null;

async function runPool(
  jobs: Job[],
  onResult: (result: Result, jobIndex: number) => Promise<void>,
  label: string
) {
  let next = 0;
  let done = 0;
  let updated = 0;
  let failed = 0;
  const total = jobs.length;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= total) break;

      const job = jobs[i];
      const coords = await geocode(job.address, job.city);
      const result: Result = coords ? { id: job.id, ...coords } : null;

      if (coords) updated++; else failed++;
      await onResult(result, i);

      done++;
      process.stdout.write(
        `\r  ${label}: ${done}/${total}  updated=${updated}  failed=${failed}   `
      );
    }
  }

  await Promise.all(Array.from({ length: WORKERS }, worker));
  console.log(`\n  ${label} done: ${updated} updated, ${failed} failed.`);
}

// ── Prisma loader ─────────────────────────────────────────────

async function loadPrisma() {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  // Verify Nominatim is reachable before starting
  try {
    const probe = await fetch(`${NOMINATIM_URL}/status.php?format=json`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!probe.ok) {
      console.error(
        `✗ Cannot reach Nominatim at ${NOMINATIM_URL} (HTTP ${probe.status}).\n` +
        `  Start it first:\n` +
        `    docker compose -f docker-compose.geocoder.yml up -d\n`
      );
      process.exit(1);
    }
    console.log(`✓ Nominatim reachable at ${NOMINATIM_URL}`);
  } catch {
    console.error(
      `✗ Cannot reach Nominatim at ${NOMINATIM_URL}.\n` +
      `  Start it first:\n` +
      `    docker compose -f docker-compose.geocoder.yml up -d\n` +
      `  Then wait for the Slovakia index to be ready (~10-20 min on first run).\n`
    );
    process.exit(1);
  }

  if (DRY_RUN) console.log("🔍  DRY RUN – no changes will be written.");
  console.log(`⚙  Workers: ${WORKERS}\n`);

  const prisma = await loadPrisma();

  // ── Organizations ──────────────────────────────────────────

  const orgs = await prisma.organization.findMany({
    select: { id: true, address: true, city: true },
  });
  console.log(`Found ${orgs.length} organizations.`);

  await runPool(
    orgs.map((o) => ({ id: o.id, address: o.address, city: o.city })),
    async (result) => {
      if (!result || DRY_RUN) return;
      await prisma.organization.update({
        where: { id: result.id },
        data: { latitude: result.lat, longitude: result.lng },
      });
    },
    "Organizations"
  );

  // ── Branches (optional) ────────────────────────────────────

  if (DO_BRANCHES) {
    const branches = await prisma.branch.findMany({
      select: { id: true, street: true, city: true },
    });
    console.log(`\nFound ${branches.length} branches.`);

    await runPool(
      branches.map((b) => ({ id: b.id, address: b.street, city: b.city })),
      async (result) => {
        if (!result || DRY_RUN) return;
        await prisma.branch.update({
          where: { id: result.id },
          data: { latitude: result.lat, longitude: result.lng },
        });
      },
      "Branches"
    );
  }

  await prisma.$disconnect();
  console.log("\nAll done.");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

