import { Router } from "express";
import { prisma } from "../lib/db.js";
import { deleteObject, presignDownload, presignUpload, sourceKey } from "../lib/storage.js";
import { HttpError, authed, parseDocumentBody, type StoredSource } from "../lib/http.js";

/**
 * Cloud documents. A document is its original source PDFs (in S3/R2, uploaded
 * directly by the browser via presigned URLs) plus editor state (JSON).
 */
export const documents = Router();

async function ownDocument(id: string, userId: string) {
  const doc = await prisma.document.findFirst({ where: { id, userId } });
  if (!doc) throw new HttpError(404, "Document not found");
  return doc;
}

const nextVersionNumber = async (tx: Pick<typeof prisma, "documentVersion">, documentId: string) => {
  const last = await tx.documentVersion.findFirst({ where: { documentId }, orderBy: { number: "desc" }, select: { number: true } });
  return (last?.number ?? 0) + 1;
};

/** List the signed-in user's documents. */
documents.get(
  "/",
  authed(async (req, res) => {
    const docs = await prisma.document.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, kind: true, pageCount: true, updatedAt: true, _count: { select: { versions: true } } },
    });
    res.json({
      documents: docs.map(({ _count, ...d }) => ({ ...d, versions: _count.versions })),
    });
  }),
);

/** Create a document. Returns presigned URLs to upload the source PDFs. */
documents.post(
  "/",
  authed(async (req, res) => {
    const body = parseDocumentBody(req.body);
    if (!body.state || !body.sources) throw new HttpError(400, "state and sources are required");
    const doc = await prisma.document.create({
      data: { userId: req.userId, name: body.name ?? "Untitled.pdf", sources: [], state: body.state as object, pageCount: body.state.pages!.length },
    });
    const sources: StoredSource[] = body.sources.map((s) => ({ ...s, key: sourceKey(req.userId, doc.id, s.id), uploaded: false }));
    await prisma.document.update({ where: { id: doc.id }, data: { sources: sources as unknown as object[] } });
    const uploads = await Promise.all(sources.map(async (s) => ({ sourceId: s.id, url: await presignUpload(s.key) })));
    res.status(201).json({ id: doc.id, uploads });
  }),
);

/** Document state + short-lived download URLs for its source files. */
documents.get(
  "/:id",
  authed(async (req, res) => {
    const doc = await ownDocument(req.params.id as string, req.userId);
    const sources = doc.sources as unknown as StoredSource[];
    const missing = sources.filter((s) => !s.uploaded);
    if (missing.length) throw new HttpError(409, `Source "${missing[0].name}" was never uploaded. Save the document again from the device that has it.`);
    res.json({
      id: doc.id,
      name: doc.name,
      state: doc.state,
      updatedAt: doc.updatedAt,
      sources: await Promise.all(sources.map(async (s) => ({ id: s.id, name: s.name, size: s.size, url: await presignDownload(s.key) }))),
    });
  }),
);

/**
 * Save state (autosave), optionally snapshotting a version. New sources get
 * presigned upload URLs; `confirm` marks uploads that finished.
 */
documents.put(
  "/:id",
  authed(async (req, res) => {
    const doc = await ownDocument(req.params.id as string, req.userId);
    const body = parseDocumentBody(req.body);
    const sources = [...(doc.sources as unknown as StoredSource[])];
    const known = new Set(sources.map((s) => s.id));
    for (const s of body.sources ?? []) {
      if (known.has(s.id)) continue;
      sources.push({ ...s, key: sourceKey(req.userId, doc.id, s.id), uploaded: false });
    }
    for (const s of sources) if (body.confirm.includes(s.id)) s.uploaded = true;
    // Re-issue URLs for anything still pending (e.g. an upload that failed earlier).
    const pending = sources.filter((s) => !s.uploaded);

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
        await tx.documentVersion.create({
          data: { documentId: doc.id, number: await nextVersionNumber(tx, doc.id), label: body.label, state: body.state as object },
        });
      }
    });

    const uploads = await Promise.all(pending.map(async (s) => ({ sourceId: s.id, url: await presignUpload(s.key) })));
    res.json({ ok: true, uploads });
  }),
);

documents.delete(
  "/:id",
  authed(async (req, res) => {
    const doc = await ownDocument(req.params.id as string, req.userId);
    await Promise.allSettled((doc.sources as unknown as StoredSource[]).map((s) => deleteObject(s.key)));
    await prisma.document.delete({ where: { id: doc.id } });
    res.json({ ok: true });
  }),
);

documents.get(
  "/:id/versions",
  authed(async (req, res) => {
    const doc = await ownDocument(req.params.id as string, req.userId);
    const versions = await prisma.documentVersion.findMany({
      where: { documentId: doc.id },
      orderBy: { number: "desc" },
      select: { number: true, label: true, createdAt: true },
    });
    res.json({ versions });
  }),
);

/** Restore a version. The current state is snapshotted first so restore is undoable. */
documents.post(
  "/:id/versions",
  authed(async (req, res) => {
    const doc = await ownDocument(req.params.id as string, req.userId);
    const number = Number((req.body as { number?: unknown })?.number);
    const version = await prisma.documentVersion.findUnique({ where: { documentId_number: { documentId: doc.id, number } } });
    if (!version) throw new HttpError(404, "Version not found");
    await prisma.$transaction(async (tx) => {
      await tx.documentVersion.create({
        data: { documentId: doc.id, number: await nextVersionNumber(tx, doc.id), label: `Before restoring v${version.number}`, state: doc.state as object },
      });
      await tx.document.update({ where: { id: doc.id }, data: { state: version.state as object } });
    });
    res.json({ ok: true });
  }),
);
