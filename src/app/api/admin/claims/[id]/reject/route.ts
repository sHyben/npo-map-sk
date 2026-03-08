import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST: Reject a claim application
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const claimId = params.id;
  const { reason } = await req.json();
  const claim = await prisma.claimApplication.findUnique({
    where: { id: claimId },
  });
  if (!claim || claim.status !== "pending") {
    return NextResponse.json({ error: "Žiadosť nenájdená alebo už vybavená." }, { status: 400 });
  }
  await prisma.claimApplication.update({
    where: { id: claimId },
    data: { status: "rejected", decidedAt: new Date(), decidedById: session.user.id, reason: reason || null },
  });
  return NextResponse.json({ success: true });
}

