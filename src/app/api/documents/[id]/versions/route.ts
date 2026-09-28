import { prisma } from "@/lib/server/db";
import { HttpError, json, route } from "@/lib/server/api";

type Ctx = { params: Promise<{ id: string }> };

async function assertOwner(id: string, userId: string) {
  const doc = await prisma.document.findFirst({ where: { id, userId }, select: { id: true, state: true } });
  if (!doc) throw new HttpError(404, "Document not found");
  return doc;
}

export const GET = route<Ctx>(async (_req, userId, { params }) => {
  const { id } = await params;
  await assertOwner(id, userId);
  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { number: "desc" },
    select: { number: true, label: true, createdAt: true },
  });
  return json({ versions });
});

/** Restore a version. The current state is snapshotted first so restore is undoable. */
export const POST = route<Ctx>(async (req, userId, { params }) => {
  const { id } = await params;
  const doc = await assertOwner(id, userId);
  const { number } = (await req.json()) as { number?: number };
  const version = await prisma.documentVersion.findUnique({ where: { documentId_number: { documentId: id, number: Number(number) } } });
  if (!version) throw new HttpError(404, "Version not found");
  await prisma.$transaction(async (tx) => {
    const last = await tx.documentVersion.findFirst({ where: { documentId: id }, orderBy: { number: "desc" }, select: { number: true } });
    await tx.documentVersion.create({
      data: { documentId: id, number: (last?.number ?? 0) + 1, label: `Before restoring v${version.number}`, state: doc.state as object },
    });
    await tx.document.update({ where: { id }, data: { state: version.state as object } });
  });
  return json({ ok: true });
});
