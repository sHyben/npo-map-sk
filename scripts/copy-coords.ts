/**
 * copy-coords.ts
 *
 * Reads latitude/longitude from the local SQLite dev.db (which has
 * been re-geocoded) and bulk-updates the Supabase PostgreSQL database.
 *
 * Prerequisites:
 *   - dev.db exists and contains geocoded coordinates
 *   - DATABASE_URL in .env points to the target PostgreSQL/Supabase DB
 *
 * Usage:
 *   npx tsx scripts/copy-coords.ts
 */

import "dotenv/config";
import Database from "better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import * as path from "path";

const BATCH_SIZE = 500;

async function main() {
  // ── Open SQLite source ───────────────────────────────────────
  const dbPath = path.resolve("dev.db");
  const sqlite = new Database(dbPath, { readonly: true });
  console.log(`Opened SQLite: ${dbPath}`);

  // ── Connect to PostgreSQL target ─────────────────────────────
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  // ── Organizations — match by ico ─────────────────────────────
  const orgs = sqlite
    .prepare("SELECT ico, latitude, longitude FROM Organization WHERE latitude IS NOT NULL")
    .all() as { ico: string; latitude: number; longitude: number }[];

  console.log(`Copying coordinates for ${orgs.length} organizations...`);

  let orgDone = 0;
  let orgSkipped = 0;
  for (let i = 0; i < orgs.length; i += BATCH_SIZE) {
    const batch = orgs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((o) =>
        prisma.organization.update({
          where: { ico: o.ico },
          data: { latitude: o.latitude, longitude: o.longitude },
        })
      )
    );
    orgDone += results.filter((r) => r.status === "fulfilled").length;
    orgSkipped += results.filter((r) => r.status === "rejected").length;
    process.stdout.write(`\r  Organizations: ${orgDone} updated, ${orgSkipped} skipped`);
  }
  console.log(`\n  Done.`);

  // ── Branches — match via parent org ico ──────────────────────
  // SQLite branches don't have a natural unique key, so we join to
  // Organization to get the ico, then look up the Supabase org id.
  const sqliteBranches = sqlite
    .prepare(`
      SELECT o.ico, b.street, b.city, b.zipCode, b.latitude, b.longitude
      FROM Branch b
      JOIN Organization o ON o.id = b.organizationId
      WHERE b.latitude IS NOT NULL
    `)
    .all() as { ico: string; street: string | null; city: string | null; zipCode: string | null; latitude: number; longitude: number }[];

  console.log(`Looking up ${sqliteBranches.length} branches in Supabase...`);

  // Build a map of ico → supabase org id
  const icoList = [...new Set(sqliteBranches.map((b) => b.ico))];
  const pgOrgs = await prisma.organization.findMany({
    where: { ico: { in: icoList } },
    select: { id: true, ico: true },
  });
  const icoToId = new Map(pgOrgs.map((o) => [o.ico, o.id]));

  let brDone = 0;
  let brSkipped = 0;
  for (let i = 0; i < sqliteBranches.length; i += BATCH_SIZE) {
    const batch = sqliteBranches.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((b) => {
        const orgId = icoToId.get(b.ico);
        if (!orgId) return Promise.reject(new Error("org not found"));
        return prisma.branch.updateMany({
          where: {
            organizationId: orgId,
            street: b.street,
            city: b.city,
            zipCode: b.zipCode,
          },
          data: { latitude: b.latitude, longitude: b.longitude },
        });
      })
    );
    brDone += results.filter((r) => r.status === "fulfilled").length;
    brSkipped += results.filter((r) => r.status === "rejected").length;
    process.stdout.write(`\r  Branches: ${brDone} updated, ${brSkipped} skipped`);
  }
  console.log(`\n  Done.`);

  sqlite.close();
  await prisma.$disconnect();
  console.log("\nAll coordinates copied successfully.");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

