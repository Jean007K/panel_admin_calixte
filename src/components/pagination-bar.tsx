"use client";

import { useTranslations } from "next-intl";

export const PAGE_SIZE = 50;

type Props = {
  total: number;
  limit?: number;
  offset: number;
  onPage: (offset: number) => void;
};

export function PaginationBar({ total, limit = PAGE_SIZE, offset, onPage }: Props) {
  const tc = useTranslations("common");
  const size = Math.max(limit, 1);
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(pages, Math.floor(offset / size) + 1);
  if (total <= size) return null;
  const prev = Math.max(0, offset - size);
  const next = offset + size;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <p className="text-xs text-[var(--text-muted)]">{tc("pageOf", { page, pages })}</p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={offset <= 0}
          onClick={() => onPage(prev)}
          className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-[var(--surface-2)]"
        >
          {tc("prev")}
        </button>
        <button
          type="button"
          disabled={next >= total}
          onClick={() => onPage(next)}
          className="rounded border border-[var(--border)] px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-[var(--surface-2)]"
        >
          {tc("next")}
        </button>
      </div>
    </div>
  );
}
