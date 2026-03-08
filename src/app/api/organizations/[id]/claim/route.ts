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
  const userName = session.user.name || "";
  const userEmail = session.user.email || "";

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

  // Check for existing pending or approved claim by this user for this org
  const existingApp = await prisma.claimApplication.findFirst({
    where: {
      organizationId: id,
      userId,
      status: { in: ["pending", "approved"] },
    },
  });
  if (existingApp) {
    return NextResponse.json(
      { error: "Už ste požiadali o prevzatie tejto organizácie. Počkajte na schválenie." },
      { status: 400 }
    );
  }

  // Check if user already manages another org
  const managesOther = await prisma.organization.findFirst({
    where: { claimedById: userId },
  });
  if (managesOther) {
    return NextResponse.json(
      { error: "Už spravujete inú organizáciu" },
      { status: 400 }
    );
  }

  // Create claim application
  await prisma.claimApplication.create({
    data: {
      organizationId: id,
      userId,
      name: userName,
      email: userEmail,
      status: "pending",
    },
  });

  return NextResponse.json({ success: true, message: "Žiadosť o prevzatie bola odoslaná. Počkajte na schválenie administrátorom." });
}
