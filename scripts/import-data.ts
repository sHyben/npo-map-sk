import "dotenv/config";
import { parse } from "csv-parse/sync";
import * as fs from "fs";
import * as path from "path";
import bcrypt from "bcryptjs";

async function loadPrisma() {
  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const { PrismaClient } = await import("../src/generated/prisma/client.js");
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:dev.db",
  });
  return new PrismaClient({ adapter });
}

// ── Reference data ────────────────────────────────────────────

const LEGAL_FORMS: Record<string, string> = {
  "117": "Nadácia",
  "701": "Občianske združenie",
  "120": "Nezisková organizácia poskytujúca verejnoprospešné služby",
  "119": "Nezisková organizácia",
  "118": "Neinvestičný fond",
  "721": "Cirkevná organizácia",
  "116": "Záujmové združenie právnických osôb",
  "382": "Verejnoprávna inštitúcia",
  "741": "Profesijná komora",
  "745": "Komora (okrem profesijných)",
  "751": "Združenie právnických osôb",
  "711": "Politická strana",
  "921": "Medzinárodná organizácia",
  "271": "Spoločenstvo vlastníkov bytov",
  "272": "Pozemkové spoločenstvo",
  "321": "Rozpočtová organizácia",
  "331": "Príspevková organizácia",
  "301": "Štátny podnik",
  "801": "Obec",
  "121": "Akciová spoločnosť",
  "112": "Spoločnosť s ručením obmedzeným",
  "205": "Družstvo",
  "601": "Vysoká škola",
  "333": "Verejná výskumná inštitúcia",
};

const OWNERSHIP_TYPES: Record<string, string> = {
  "0": "Nezistený",
  "1": "Medzinárodné verejné",
  "2": "Súkromné tuzemské",
  "3": "Družstevné",
  "4": "Štátne",
  "5": "Obecné (komunálne)",
  "6": "Vlastníctvo združení",
  "7": "Zahraničné",
  "8": "Medzinárodné súkromné",
  "9": "Zmiešané",
};

function estimateSize(taxGift: number | null): { code: string; name: string } {
  if (!taxGift || taxGift <= 0) return { code: "00", name: "Nezistený" };
  if (taxGift < 1000) return { code: "01", name: "0 zamestnancov" };
  if (taxGift < 5000) return { code: "02", name: "1 zamestnanec" };
  if (taxGift < 15000) return { code: "03", name: "2 zamestnanci" };
  if (taxGift < 30000) return { code: "04", name: "3-4 zamestnanci" };
  if (taxGift < 80000) return { code: "05", name: "5-9 zamestnancov" };
  if (taxGift < 200000) return { code: "06", name: "10-19 zamestnancov" };
  if (taxGift < 400000) return { code: "07", name: "20-24 zamestnancov" };
  if (taxGift < 800000) return { code: "11", name: "25-49 zamestnancov" };
  if (taxGift < 2000000) return { code: "12", name: "50-99 zamestnancov" };
  return { code: "21", name: "100-149 zamestnancov" };
}

// ── Slovak city coordinates ───────────────────────────────────

const CITY_COORDS: Record<string, [number, number]> = {
  "bratislava": [48.1486, 17.1077],
  "košice": [48.7164, 21.2611],
  "prešov": [48.9986, 21.2391],
  "žilina": [49.2231, 18.7394],
  "banská bystrica": [48.7395, 19.1533],
  "nitra": [48.3069, 18.0869],
  "trnava": [48.3774, 17.5877],
  "trenčín": [48.8945, 18.0444],
  "martin": [49.0636, 18.9214],
  "poprad": [49.0598, 20.2974],
  "prievidza": [48.7744, 18.6249],
  "zvolen": [48.5756, 19.1233],
  "považská bystrica": [49.1217, 18.4214],
  "michalovce": [48.7544, 21.9198],
  "spišská nová ves": [48.9466, 20.5662],
  "komárno": [47.7631, 18.1204],
  "levice": [48.2157, 18.6063],
  "humenné": [48.9367, 21.9061],
  "bardejov": [49.2916, 21.2759],
  "liptovský mikuláš": [49.0837, 19.6117],
  "ružomberok": [49.0745, 19.3022],
  "lučenec": [48.3307, 19.6661],
  "piešťany": [48.5947, 17.8256],
  "dunajská streda": [47.9933, 17.6120],
  "čadca": [49.4375, 18.7902],
  "rimavská sobota": [48.3830, 20.0224],
  "topoľčany": [48.5625, 18.1750],
  "nové zámky": [47.9859, 18.1618],
  "dolný kubín": [49.2094, 19.2969],
  "trebišov": [48.6283, 21.7183],
  "snina": [48.9878, 22.1530],
  "skalica": [48.8453, 17.2272],
  "pezinok": [48.2894, 17.2666],
  "senec": [48.2197, 17.3997],
  "malacky": [48.4367, 17.0219],
  "galanta": [48.1908, 17.7286],
  "hlohovec": [48.4297, 17.8014],
  "senica": [48.6809, 17.3681],
  "partizánske": [48.6292, 18.3828],
  "handlová": [48.7275, 18.7650],
  "brezno": [48.8064, 19.6386],
  "detva": [48.5581, 19.4211],
  "krupina": [48.3550, 19.0697],
  "vranov nad topľou": [48.8833, 21.6853],
  "kežmarok": [49.1361, 20.4286],
  "stará ľubovňa": [49.3017, 20.6881],
  "sabinov": [49.1028, 21.0947],
  "svidník": [49.3064, 21.5672],
  "medzilaborce": [49.2711, 21.9044],
  "stropkov": [49.2025, 21.6511],
  "tvrdošín": [49.3367, 19.5558],
  "námestovo": [49.4067, 19.4839],
  "turčianske teplice": [48.8639, 18.8589],
  "zlaté moravce": [48.3806, 18.3975],
  "šaľa": [48.1500, 17.8781],
  "štúrovo": [47.7989, 18.7219],
  "rožňava": [48.6603, 20.5317],
  "revúca": [48.6833, 20.1167],
  "veľký krtíš": [48.2128, 19.3483],
  "poltár": [48.4306, 19.7903],
  "gelnica": [48.8556, 20.9339],
  "sobrance": [48.7453, 22.1806],
  "myjava": [48.7564, 17.5681],
  "púchov": [49.1247, 18.3267],
  "ilava": [48.9975, 18.2319],
  "bytča": [49.2228, 18.5575],
  "kysucké nové mesto": [49.2997, 18.7811],
  "banská štiavnica": [48.4589, 18.8942],
  "sliač": [48.6103, 19.1472],
  "teplička nad váhom": [49.1847, 18.7775],
  "nové mesto nad váhom": [48.7575, 17.8303],
  "spišské podhradie": [49.0003, 20.7508],
  "svit": [49.0547, 20.2200],
  "sereď": [48.2822, 17.7369],
  "leopoldov": [48.4478, 17.7656],
  "modra": [48.3367, 17.3067],
  "svätý jur": [48.2508, 17.2144],
  "stupava": [48.2778, 17.0350],
};

function geocodeCity(city: string | undefined): { lat: number; lng: number } | null {
  if (!city) return null;

  const normalized = city
    .toLowerCase()
    .replace(/\s*-\s*mestská časť\s+.*/i, "")
    .replace(/\s*-\s*.*/, "")
    .trim();

  if (CITY_COORDS[normalized]) {
    const [lat, lng] = CITY_COORDS[normalized];
    return {
      lat: lat + (Math.random() - 0.5) * 0.008,
      lng: lng + (Math.random() - 0.5) * 0.012,
    };
  }

  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        lat: coords[0] + (Math.random() - 0.5) * 0.008,
        lng: coords[1] + (Math.random() - 0.5) * 0.012,
      };
    }
  }

  return {
    lat: 48.3 + Math.random() * 1.2,
    lng: 17.0 + Math.random() * 5.2,
  };
}

// ── Main import function ──────────────────────────────────────

async function main() {
  const prisma = await loadPrisma();

  console.log("Starting data import...");

  const csvPath = path.join(import.meta.dirname || __dirname, "..", "data", "npo-data.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8").replace(/^\uFEFF/, "");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    quote: '"',
    escape: '"',
    trim: true,
  }) as Record<string, string>[];

  console.log(`Parsed ${records.length} records from CSV`);

  const addrPath = path.join(import.meta.dirname || __dirname, "..", "data", "npo-addresses.json");
  const addrData = JSON.parse(fs.readFileSync(addrPath, "utf-8"));
  const addressMap = addrData.results as Record<string, { s: string; bn: string; rn: string; pc: string; m: string; mc: string }>;

  console.log(`Loaded ${Object.keys(addressMap).length} addresses`);

  const npoLegalForms = new Set(["117", "701", "120", "119", "118", "721", "116", "382", "741", "745", "751"]);

  const orgMap = new Map<string, Record<string, string>>();
  for (const record of records) {
    const ico = record.ICO?.trim();
    if (!ico) continue;
    const lf = record.LegalFormCode?.trim();
    if (!npoLegalForms.has(lf)) continue;

    const existing = orgMap.get(ico);
    if (!existing || (record.Year && (!existing.Year || parseInt(record.Year) > parseInt(existing.Year)))) {
      orgMap.set(ico, record);
    }
  }

  console.log(`Filtered to ${orgMap.size} unique NPO organizations`);

  console.log("Clearing existing data...");
  await prisma.notification.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.helpRequest.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const BATCH_SIZE = 500;
  const orgs = Array.from(orgMap.values());
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < orgs.length; i += BATCH_SIZE) {
    const batch = orgs.slice(i, i + BATCH_SIZE);
    const createData = [];

    for (const record of batch) {
      const ico = record.ICO?.trim();
      if (!ico) { skipped++; continue; }

      const name = record.Name?.trim();
      if (!name) { skipped++; continue; }

      const legalFormCode = record.LegalFormCode?.trim() || null;
      const ownershipCode = record.OwnershipTypeCode?.trim() || null;
      const taxGift = record.TaxGift ? parseFloat(record.TaxGift) : null;
      const size = estimateSize(taxGift);
      const coords = geocodeCity(record.City);

      let creationDate: Date | null = null;
      if (record.CreationDate) {
        try { creationDate = new Date(record.CreationDate); } catch { /* ignore */ }
      }

      let cancellationDate: Date | null = null;
      if (record.CancellationDate) {
        try { cancellationDate = new Date(record.CancellationDate); } catch { /* ignore */ }
      }

      createData.push({
        ico,
        name,
        activity: record.Activity?.trim() || null,
        skNace: record.SKNace?.trim() || null,
        address: record.Address?.trim() || null,
        city: record.City?.trim() || null,
        zipCode: record.ZipCode?.trim() || null,
        legalFormCode,
        legalFormName: legalFormCode ? (LEGAL_FORMS[legalFormCode] || null) : null,
        ownershipCode,
        ownershipName: ownershipCode ? (OWNERSHIP_TYPES[ownershipCode] || null) : null,
        sizeCategory: size.code,
        sizeName: size.name,
        creationDate,
        cancellationDate,
        taxGift: taxGift && !isNaN(taxGift) ? taxGift : null,
        latitude: coords?.lat || null,
        longitude: coords?.lng || null,
      });
    }

    if (createData.length > 0) {
      await prisma.organization.createMany({
        data: createData,
      });
      imported += createData.length;
    }

    if ((i / BATCH_SIZE) % 10 === 0) {
      console.log(`  Imported ${imported} organizations...`);
    }
  }

  console.log(`Imported ${imported} organizations (skipped ${skipped})`);

  console.log("Importing branch addresses...");
  let branchCount = 0;

  const allOrgs = await prisma.organization.findMany({ select: { id: true, ico: true } });
  const icoToId = new Map(allOrgs.map((o: { id: string; ico: string }) => [o.ico, o.id]));

  let branchBatch: Array<{
    organizationId: string;
    street: string | null;
    buildingNumber: string | null;
    registrationNumber: string | null;
    zipCode: string | null;
    city: string | null;
    municipalCode: string | null;
    latitude: number | null;
    longitude: number | null;
  }> = [];

  for (const [ico, addr] of Object.entries(addressMap)) {
    const orgId = icoToId.get(ico);
    if (!orgId) continue;

    const typedAddr = addr as { s: string; bn: string; rn: string; pc: string; m: string; mc: string };
    const coords = geocodeCity(typedAddr.m);
    branchBatch.push({
      organizationId: orgId,
      street: typedAddr.s || null,
      buildingNumber: typedAddr.bn || null,
      registrationNumber: String(typedAddr.rn) || null,
      zipCode: typedAddr.pc || null,
      city: typedAddr.m || null,
      municipalCode: typedAddr.mc || null,
      latitude: coords?.lat || null,
      longitude: coords?.lng || null,
    });

    if (branchBatch.length >= BATCH_SIZE) {
      await prisma.branch.createMany({ data: branchBatch });
      branchCount += branchBatch.length;
      branchBatch = [];
    }
  }

  if (branchBatch.length > 0) {
    await prisma.branch.createMany({ data: branchBatch });
    branchCount += branchBatch.length;
  }

  console.log(`Imported ${branchCount} branch addresses`);

  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@npomap.sk" },
    update: {},
    create: {
      email: "admin@npomap.sk",
      name: "Admin",
      passwordHash: adminHash,
      role: "admin",
    },
  });
  console.log("Created admin user (admin@npomap.sk / admin123)");

  console.log("Import complete!");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Import error:", e);
  process.exit(1);
});
