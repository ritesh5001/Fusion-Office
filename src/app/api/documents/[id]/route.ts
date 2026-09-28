import { prisma } from "@/lib/server/db";
import { deleteObject, presignDownload, presignUpload, sourceKey } from "@/lib/server/storage";
import { HttpError, json, parseDocumentBody, route, type StoredSource } from "@/lib/server/api";

type Ctx = { params: Promise<{ id: string }> };

async function ownDocument(id: string, userId: string) {
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) throw new HttpError(404, "Document not found");
  return doc;
}

/** Document state + short-lived download URLs for its source files. */
export const GET = route<Ctx>(async (_req, userId, { params }) => {
  const doc = await ownDocument((await params).id, userId);
  const sources = doc.sources as unknown as StoredSource[];
  const missing = sources.filter((s) => !s.uploaded);
  if (missing.length) throw new HttpError(409, `Source "${missing[0].name}" was never uploaded. Save the document again from the device that has it.`);
  return json({
    id: doc.id,
    name: doc.name,
    state: doc.state,
    updatedAt: doc.updatedAt,
    sources: await Promise.all(sources.map(async (s) => ({ id: s.id, name: s.name, size: s.size, url: await presignDownload(s.key) }))),
  });
});

/**
 * Save state (autosave), optionally snapshotting a version. New sources get
 * presigned upload URLs; `confirm` marks uploads that finished.
 */
export const PUT = route<Ctx>(async (req, userId, { params }) => {
  const doc = await ownDocument((await params).id, userId);
  const body = parseDocumentBody(await req.json());
  const sources = [...(doc.sources as unknown as StoredSource[])];
  const known = new Set(sources.map((s) => s.id));
  const fresh: StoredSource[] = [];
  for (const s of body.sources ?? []) {
    if (known.has(s.id)) continue;
    const entry = { ...s, key: sourceKey(userId, doc.id, s.id), uploaded: false };
    sources.push(entry);
    fresh.push(entry);
  }
  for (const s of sources) if (body.confirm.includes(s.id)) s.uploaded = true;
  // Re-issue URLs for anything still pending (e.g. an upload that failed earlier).
  const pending = sources.filter((s) => !s.uploaded && !body.confirm.includes(s.id));

  await prisma.$transaction(async (tx) => {
    await tx.document.update({
      where: { id: doc.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.state ? { state: body.state as object, pageCount: body.state.pages!.length } : {}),
        sources: sources as unknown as object[],
      },
    });
    if (body.version && body.state) {
      const last = await tx.documentVersion.findFirst({ where: { documentId: doc.id }, orderBy: { number: "desc" }, select: { number: true } });
      await tx.documentVersion.create({
        data: { documentId: doc.id, number: (last?.number ?? 0) + 1, label: body.label, state: body.state as object },
      });
    }
  });

  const uploads = await Promise.all(pending.map(async (s) => ({ sourceId: s.id, url: await presignUpload(s.key) })));
  return json({ ok: true, uploads, created: fresh.length });
});

export const DELETE = route<Ctx>(async (_req, userId, { params }) => {
  const doc = await ownDocument((await params).id, userId);
  await Promise.allSettled((doc.sources as unknown as StoredSource[]).map((s) => deleteObject(s.key)));
  await prisma.document.delete({ where: { id: doc.id } });
  return json({ ok: true });
});
