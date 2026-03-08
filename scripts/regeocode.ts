/**
 * regeocode.ts
 *
 * Re-geocodes all Organization (and Branch) rows whose lat/lng need fixing,
 * using the Nominatim OpenStreetMap API (free, no key required).
 *
 * Rate limit: 1 request per second (Nominatim ToS).
 *
 * Usage:
 *   npx tsx scripts/regeocode.ts
 *
 * Optional flags:
 *   --dry-run   Print what would be updated without writing to the DB.
 *   --branches  Also re-geocode Branch records.
 */

import "dotenv/config";

const DRY_RUN = process.argv.includes("--dry-run");
const DO_BRANCHES = process.argv.includes("--branches");

// ── Nominatim geocoder ────────────────────────────────────────

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "npo-map-sk/1.0 (regeocode script)";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocode(
  address: string | null,
  city: string | null
): Promise<{ lat: number; lng: number } | null> {
  // Build query strings – try full address first, then city only
  const queries: string[] = [];

  if (address && city) {
    queries.push(`${address}, ${city}, Slovakia`);
  }
  if (city) {
    queries.push(`${city}, Slovakia`);
  }
  if (address) {
    queries.push(`${address}, Slovakia`);
  }

  for (const q of queries) {
    const url =
      `${NOMINATIM}?` +
      new URLSearchParams({
        q,
        format: "json",
        limit: "1",
        countrycodes: "sk",
      });

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
      });

      if (!res.ok) {
        console.warn(`  Nominatim HTTP ${res.status} for "${q}"`);
        await sleep(2000);
        continue;
      }

      const data = (await res.json()) as Array<{
        lat: string;
        lon: string;
        display_name: string;
      }>;

      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.warn(`  Fetch error for "${q}":`, err);
    }

    // Respect rate limit between retries
    await sleep(1100);
  }

  return null;
}

// ── Prisma loader ─────────────────────────────────────────────

async function loadPrisma() {
  const { PrismaBetterSqlite3 } = await import(
    "@prisma/adapter-better-sqlite3"
  );
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:dev.db",
  });
  return new PrismaClient({ adapter });
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const prisma = await loadPrisma();

  if (DRY_RUN) console.log("🔍  DRY RUN – no changes will be written.\n");

  // ── Organizations ──────────────────────────────────────────

  const orgs = await prisma.organization.findMany({
    select: { id: true, address: true, city: true, latitude: true, longitude: true },
  });

  console.log(`Found ${orgs.length} organizations to re-geocode.`);

  let orgUpdated = 0;
  let orgFailed = 0;

  for (let i = 0; i < orgs.length; i++) {
    const org = orgs[i];
    process.stdout.write(
      `\r  Orgs: ${i + 1}/${orgs.length}  updated=${orgUpdated}  failed=${orgFailed}   `
    );

    const coords = await geocode(org.address, org.city);
    await sleep(1100); // stay within 1 req/s

    if (!coords) {
      orgFailed++;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
    }
    orgUpdated++;
  }

  console.log(
    `\n\nOrganizations: ${orgUpdated} updated, ${orgFailed} failed (no result from Nominatim).`
  );

  // ── Branches (optional) ────────────────────────────────────

  if (DO_BRANCHES) {
    const branches = await prisma.branch.findMany({
      select: { id: true, street: true, city: true, latitude: true, longitude: true },
    });

    console.log(`\nFound ${branches.length} branches to re-geocode.`);

    let brUpdated = 0;
    let brFailed = 0;

    for (let i = 0; i < branches.length; i++) {
      const br = branches[i];
      process.stdout.write(
        `\r  Branches: ${i + 1}/${branches.length}  updated=${brUpdated}  failed=${brFailed}   `
      );

      const coords = await geocode(br.street, br.city);
      await sleep(1100);

      if (!coords) {
        brFailed++;
        continue;
      }

      if (!DRY_RUN) {
        await prisma.branch.update({
          where: { id: br.id },
          data: { latitude: coords.lat, longitude: coords.lng },
        });
      }
      brUpdated++;
    }

    console.log(
      `\n\nBranches: ${brUpdated} updated, ${brFailed} failed.`
    );
  }

  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

