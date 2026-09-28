import Link from "next/link";
import type { Metadata } from "next";
import { Cloud } from "lucide-react";
import { cloudEnabled, currentUser } from "@/auth";
import { prisma } from "@/lib/server/db";
import { Logo } from "@/components/Logo";
import { SignInButton, SignOutButton } from "@/components/home/AuthButtons";
import { DocumentList } from "@/components/home/DocumentList";

export const metadata: Metadata = { title: "My documents" };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = cloudEnabled ? await currentUser() : null;
  const docs = user
    ? await prisma.document.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, name: true, pageCount: true, updatedAt: true, _count: { select: { versions: true } } },
      })
    : [];

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <Logo className="h-7 w-7" /> Fusion Office
          </Link>
          <div className="flex items-center gap-2">
            {user && <span className="hidden text-[13px] text-slate-500 sm:inline">{user.email ?? user.name}</span>}
            {user && <SignOutButton />}
            <Link href="/editor" className="inline-flex h-9 items-center rounded-md bg-brand-600 px-3.5 text-sm font-medium text-white hover:bg-brand-700">
              Open editor
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My documents</h1>
        {!cloudEnabled ? (
          <Notice title="Cloud storage isn't set up">
            Add database, Auth.js and S3/R2 settings to <code className="rounded bg-slate-100 px-1">.env</code> (see <code className="rounded bg-slate-100 px-1">.env.example</code>). The editor works fully without it: documents are saved in your browser.
          </Notice>
        ) : !user ? (
          <Notice title="Sign in to see your cloud documents">
            <div className="mt-3">
              <SignInButton />
            </div>
          </Notice>
        ) : docs.length === 0 ? (
          <Notice title="No cloud documents yet">
            Open a PDF in the editor and choose <strong>File → Save to cloud</strong>.
          </Notice>
        ) : (
          <DocumentList docs={docs.map((d) => ({ id: d.id, name: d.name, pageCount: d.pageCount, updatedAt: d.updatedAt.toISOString(), versions: d._count.versions }))} />
        )}
      </main>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 font-medium text-slate-800">
        <Cloud className="h-4 w-4 text-slate-400" /> {title}
      </div>
      <div className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}
