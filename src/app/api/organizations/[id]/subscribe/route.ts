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

  const existing = await prisma.subscription.findFirst({
    where: { userId, organizationId: id },
  });

  if (existing) {
    // Unsubscribe
    await prisma.subscription.delete({ where: { id: existing.id } });
    return NextResponse.json({ subscribed: false });
  }

  // Subscribe
  await prisma.subscription.create({
    data: { userId, organizationId: id },
  });

  return NextResponse.json({ subscribed: true });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ subscribed: false });
  }

  const existing = await prisma.subscription.findFirst({
    where: { userId: session.user.id!, organizationId: id },
  });

  return NextResponse.json({ subscribed: !!existing });
}
