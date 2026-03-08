import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const activities = await prisma.organization.findMany({
    where: { activity: { not: null } },
    select: { activity: true },
    distinct: ["activity"],
    orderBy: { activity: "asc" },
  });

  return NextResponse.json(
    activities.map((a) => a.activity).filter(Boolean)
  );
}
