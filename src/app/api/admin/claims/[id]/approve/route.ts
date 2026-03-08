import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: Approve a claim application
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const claimId = params.id;
  const claim = await prisma.claimApplication.findUnique({
    where: { id: claimId },
    include: { organization: true, user: true },
  });
  if (!claim || claim.status !== "pending") {
    return NextResponse.json({ error: "Žiadosť nenájdená alebo už vybavená." }, { status: 400 });
  }
  // Check if org is already claimed
  if (claim.organization.claimedById) {
    await prisma.claimApplication.update({
      where: { id: claimId },
      data: { status: "rejected", decidedAt: new Date(), decidedById: session.user.id, reason: "Organizácia už bola prevzatá." },
    });
    return NextResponse.json({ error: "Organizácia už bola prevzatá." }, { status: 400 });
  }
  // Approve: assign ownership, update user role, mark application as approved
  await prisma.$transaction([
    prisma.organization.update({
      where: { id: claim.organizationId },
      data: { claimedById: claim.userId },
    }),
    prisma.user.update({
      where: { id: claim.userId },
      data: { role: "org" },
    }),
    prisma.claimApplication.update({
      where: { id: claimId },
      data: { status: "approved", decidedAt: new Date(), decidedById: session.user.id },
    }),
    // Optionally, reject all other pending claims for this org
    prisma.claimApplication.updateMany({
      where: { organizationId: claim.organizationId, status: "pending", id: { not: claimId } },
      data: { status: "rejected", decidedAt: new Date(), decidedById: session.user.id, reason: "Iný používateľ bol schválený." },
    })
  ]);
  return NextResponse.json({ success: true });
}

