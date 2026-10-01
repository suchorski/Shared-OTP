"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { AuditTable } from "@/components/AuditTable";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { ACTION_LABELS } from "@/lib/format";
import { OmSelect, useAdminOms, useQueryParams } from "../shared";

function AuditAdmin() {
  const { user: me } = useAuth();
  const notify = useToast();
  const isGlobal = me.role === "ADMIN_GLOBAL";
  const oms = useAdminOms();
  const params = useQueryParams();
  const [filters, setFilters] = useState({ action: "", om: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const set = (key) => (e) => {
    const value = typeof e === "string" ? e : e.target.value;
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const load = useCallback(async () => {
    if (!params) return;
    try {
      setData(await api("/admin/audit", { query: { ...filters, userId: params.userId, otpId: params.otpId, page } }));
    } catch (err) {
      notify(err.message, "error");
    }
  }, [params, filters, page, notify]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <ScrollText className="text-blue-900" /> Auditoria
          {!isGlobal && <span className="text-base font-normal text-gray-500">({me.om})</span>}
        </h1>
        <div className="flex w-full flex-col gap-2 lg:ml-auto lg:w-auto lg:flex-row lg:items-center">
          <select className="input-field lg:w-auto" value={filters.action} onChange={set("action")}>
            <option value="">Todas as ações</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {isGlobal && <OmSelect value={filters.om} onChange={set("om")} oms={oms} />}
          <input type="date" className="input-field lg:w-auto" value={filters.from} onChange={set("from")} title="De" />
          <input type="date" className="input-field lg:w-auto" value={filters.to} onChange={set("to")} title="Até" />
        </div>
      </div>
      <div className="card">
        {!data ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <>
            <AuditTable items={data.items} />
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </div>
    </>
  );
}

export default function AdminAuditoriaPage() {
  return (
    <AppShell adminOnly>
      <AuditAdmin />
    </AppShell>
  );
}
