import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  }

  const subscriptions = await prisma.subscription.findMany({
    where: { userId: session.user.id! },
    include: {
      organization: { select: { id: true, name: true, activity: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(subscriptions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  }

  const { topic } = await req.json();
  if (!topic) {
    return NextResponse.json({ error: "Téma je povinná" }, { status: 400 });
  }

  const userId = session.user.id!;

  const existing = await prisma.subscription.findFirst({
    where: { userId, topic },
  });

  if (existing) {
    await prisma.subscription.delete({ where: { id: existing.id } });
    return NextResponse.json({ subscribed: false });
  }

  await prisma.subscription.create({
    data: { userId, topic },
  });

  return NextResponse.json({ subscribed: true });
}
