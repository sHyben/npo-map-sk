import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      branches: true,
      helpRequests: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          subscriptions: true,
          helpRequests: { where: { status: "active" } },
        },
      },
    },
  });

  if (!org) {
    return NextResponse.json({ error: "Organizácia nenájdená" }, { status: 404 });
  }

  return NextResponse.json(org);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string; orgId: string | null };

  // Only org owner or admin can edit
  if (user.role !== "admin" && user.orgId !== id) {
    return NextResponse.json({ error: "Nemáte oprávnenie" }, { status: 403 });
  }

  const data = await req.json();
  const allowedFields = ["description", "address", "city", "zipCode"];
  const updateData: Record<string, string> = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) updateData[field] = data[field];
  }

  const org = await prisma.organization.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(org);
}
