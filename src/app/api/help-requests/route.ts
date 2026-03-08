import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const helpType = searchParams.get("helpType");
  const activity = searchParams.get("activity");
  const city = searchParams.get("city");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  const where: Record<string, unknown> = { status: "active" };

  if (helpType) where.helpType = helpType;
  if (activity) {
    where.organization = { activity };
  }
  if (city) {
    where.organization = { ...(where.organization as object || {}), city: { contains: city } };
  }

  const [requests, total] = await Promise.all([
    prisma.helpRequest.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, city: true, activity: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.helpRequest.count({ where }),
  ]);

  return NextResponse.json({
    requests,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
