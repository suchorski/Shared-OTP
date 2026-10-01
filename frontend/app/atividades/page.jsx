"use client";

import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuditTable } from "@/components/AuditTable";
import { Pagination } from "@/components/Pagination";
import { api } from "@/lib/api";

export default function AtividadesPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/audit/me", { query: { page } })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [page]);

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold flex items-center gap-2 mb-6">
        <History className="text-blue-900" /> Minhas atividades
      </h1>
      <div className="card">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !data ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <>
            <AuditTable items={data.items} showActor={false} />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </div>
    </AppShell>
  );
}
