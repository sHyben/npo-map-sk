import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const activity = searchParams.get("activity");
  const city = searchParams.get("city");
  const legalForm = searchParams.get("legalForm");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
  const mapView = searchParams.get("mapView") === "true";

  const where: Record<string, unknown> = {};

  if (activity) where.activity = activity;
  if (city) where.city = { contains: city };
  if (legalForm) where.legalFormCode = legalForm;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { city: { contains: search } },
      { ico: { contains: search } },
    ];
  }

  // For map view, return lightweight data with coordinates
  if (mapView) {
    const orgs = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        ico: true,
        name: true,
        activity: true,
        city: true,
        legalFormName: true,
        latitude: true,
        longitude: true,
        _count: { select: { helpRequests: { where: { status: "active" } } } },
      },
      take: 5000,
    });
    return NextResponse.json(orgs);
  }

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      select: {
        id: true,
        ico: true,
        name: true,
        activity: true,
        city: true,
        zipCode: true,
        legalFormName: true,
        sizeName: true,
        taxGift: true,
        latitude: true,
        longitude: true,
        creationDate: true,
        _count: { select: { helpRequests: { where: { status: "active" } } } },
      },
      orderBy: { taxGift: { sort: "desc", nulls: "last" } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.organization.count({ where }),
  ]);

  return NextResponse.json({
    organizations: orgs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
