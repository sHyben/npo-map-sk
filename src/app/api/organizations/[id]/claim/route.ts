import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  }

  const userId = session.user.id!;

  // Check if org exists
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, claimedById: true },
  });

  if (!org) {
    return NextResponse.json({ error: "Organizácia nenájdená" }, { status: 404 });
  }

  if (org.claimedById) {
    return NextResponse.json(
      { error: "Organizácia je už spravovaná iným používateľom" },
      { status: 400 }
    );
  }

  // Check if user already claimed another org
  const existingClaim = await prisma.organization.findFirst({
    where: { claimedById: userId },
  });

  if (existingClaim) {
    return NextResponse.json(
      { error: "Už spravujete inú organizáciu" },
      { status: 400 }
    );
  }

  // Claim the org and update user role
  await prisma.$transaction([
    prisma.organization.update({
      where: { id },
      data: { claimedById: userId },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { role: "org" },
    }),
  ]);

  return NextResponse.json({ success: true });
}
