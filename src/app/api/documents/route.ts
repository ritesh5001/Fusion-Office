import { prisma } from "@/lib/server/db";
import { presignUpload, sourceKey } from "@/lib/server/storage";
import { HttpError, json, parseDocumentBody, route, type StoredSource } from "@/lib/server/api";

/** List the signed-in user's documents. */
export const GET = route(async (_req, userId) => {
  const docs = await prisma.document.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, kind: true, pageCount: true, updatedAt: true, _count: { select: { versions: true } } },
  });
  return json({ documents: docs });
});

/** Create a cloud document. Returns presigned URLs to upload the source PDFs. */
export const POST = route(async (req, userId) => {
  const body = parseDocumentBody(await req.json());
  if (!body.state || !body.sources) throw new HttpError(400, "state and sources are required");
  const doc = await prisma.document.create({
    data: { userId, name: body.name ?? "Untitled.pdf", sources: [], state: body.state as object, pageCount: body.state.pages!.length },
  });
  const sources: StoredSource[] = body.sources.map((s) => ({ ...s, key: sourceKey(userId, doc.id, s.id), uploaded: false }));
  await prisma.document.update({ where: { id: doc.id }, data: { sources: sources as unknown as object[] } });
  const uploads = await Promise.all(sources.map(async (s) => ({ sourceId: s.id, url: await presignUpload(s.key) })));
  return json({ id: doc.id, uploads }, 201);
});
