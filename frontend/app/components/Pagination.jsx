"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between text-sm text-gray-600 mt-3">
      <span>{total} registro(s)</span>
      <div className="flex items-center gap-2">
        <button className="btn-icon" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Anterior">
          <ChevronLeft size={16} />
        </button>
        <span>
          {page} / {pages}
        </span>
        <button className="btn-icon" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Próxima">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
