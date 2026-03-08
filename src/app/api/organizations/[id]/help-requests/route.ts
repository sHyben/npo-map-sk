import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const requests = await prisma.helpRequest.findMany({
    where: { organizationId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Neprihlásený" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string; orgId: string | null };
  if (user.role !== "admin" && user.orgId !== id) {
    return NextResponse.json({ error: "Nemáte oprávnenie" }, { status: 403 });
  }

  const data = await req.json();
  const { helpType, title, description, deadline, contactEmail, contactPhone } = data;

  if (!helpType || !title || !description) {
    return NextResponse.json(
      { error: "Typ pomoci, názov a popis sú povinné" },
      { status: 400 }
    );
  }

  const validTypes = ["people", "technology", "services", "knowhow"];
  if (!validTypes.includes(helpType)) {
    return NextResponse.json({ error: "Neplatný typ pomoci" }, { status: 400 });
  }

  const helpRequest = await prisma.helpRequest.create({
    data: {
      organizationId: id,
      helpType,
      title,
      description,
      deadline: deadline ? new Date(deadline) : null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
    },
  });

  // Create notifications for subscribers
  const orgSubscribers = await prisma.subscription.findMany({
    where: { organizationId: id },
    select: { userId: true },
  });

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { name: true, activity: true },
  });

  // Also notify topic subscribers
  const topicSubscribers = org?.activity
    ? await prisma.subscription.findMany({
        where: { topic: org.activity },
        select: { userId: true },
      })
    : [];

  const allSubscriberIds = new Set([
    ...orgSubscribers.map((s) => s.userId),
    ...topicSubscribers.map((s) => s.userId),
  ]);

  // Don't notify the user who created the request
  allSubscriberIds.delete(user.id);

  if (allSubscriberIds.size > 0) {
    const helpTypeLabels: Record<string, string> = {
      people: "Ľudia",
      technology: "Technika",
      services: "Služby",
      knowhow: "Know-how",
    };

    await prisma.notification.createMany({
      data: Array.from(allSubscriberIds).map((userId) => ({
        userId,
        title: `Nová požiadavka: ${helpTypeLabels[helpType]}`,
        message: `${org?.name} hľadá pomoc: ${title}`,
        link: `/organization/${id}`,
      })),
    });
  }

  return NextResponse.json(helpRequest);
}
