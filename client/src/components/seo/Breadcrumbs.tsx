import Link from "next/link";
import { ChevronRight } from "lucide-react";

/** Visible breadcrumb trail; the last item is the current page. Pair with breadcrumbs() JSON-LD. */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-fg-subtle">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.path} className={last ? "min-w-0 truncate font-medium text-fg-muted" : "flex shrink-0 items-center gap-1.5"}>
              {last ? (
                <span aria-current="page">{it.name}</span>
              ) : (
                <>
                  <Link href={it.path} className="hover:text-fg">
                    {it.name}
                  </Link>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
