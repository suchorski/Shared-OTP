"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { ConfirmModal } from "@/components/Modal";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { formatDateTime, ROLE_LABELS, userLabel } from "@/lib/format";
import { OmSelect, useAdminOms } from "../shared";

function UsersAdmin() {
  const { user: me } = useAuth();
  const notify = useToast();
  const isGlobal = me.role === "ADMIN_GLOBAL";
  const oms = useAdminOms();
  const [q, setQ] = useState("");
  const [om, setOm] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const term = q.trim();
      setData(await api("/admin/users", { query: { q: term.length >= 3 ? term : "", om, role, page } }));
    } catch (err) {
      notify(err.message, "error");
    }
  }, [q, om, role, page, notify]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function changeRole() {
    setBusy(true);
    try {
      await api(`/admin/users/${pending.user.id}/role`, { method: "PUT", body: { role: pending.role } });
      notify(`Perfil de ${userLabel(pending.user)} alterado para ${ROLE_LABELS[pending.role]}`);
      setPending(null);
      load();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Users className="text-blue-900" /> Usuários
          {!isGlobal && <span className="text-base font-normal text-gray-500">({me.om})</span>}
        </h1>
        <div className="flex w-full flex-col gap-2 lg:ml-auto lg:w-auto lg:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9 lg:w-72"
              placeholder="CPF, SARAM, guerra ou nome (mín. 3)"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          {isGlobal && <OmSelect value={om} onChange={(v) => { setOm(v); setPage(1); }} oms={oms} />}
          <select className="input-field lg:w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Todos os perfis</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        {!data ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <>
            <table className="table-base">
              <thead>
                <tr>
                  <th>Militar</th>
                  <th>Nome completo</th>
                  <th>OM</th>
                  <th>SARAM</th>
                  <th>CPF</th>
                  <th>OTPs</th>
                  <th>Último login</th>
                  <th>Perfil</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">{userLabel(u)}</td>
                    <td>{u.name || "—"}</td>
                    <td>{u.om || "—"}</td>
                    <td>{u.saram || "—"}</td>
                    <td className="whitespace-nowrap">{u.cpfMasked}</td>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/otps?userId=${u.id}`} className="text-blue-900 underline">
                        {u.ownedCount} próprios · {u.sharedWithCount} recebidos
                      </Link>
                    </td>
                    <td className="whitespace-nowrap">{formatDateTime(u.lastLoginAt)}</td>
                    <td>
                      {isGlobal && u.id !== me.id ? (
                        <select
                          className="input-field py-1 w-auto"
                          value={u.role}
                          onChange={(e) => setPending({ user: u, role: e.target.value })}
                        >
                          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      ) : (
                        ROLE_LABELS[u.role]
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </div>

      {pending && (
        <ConfirmModal
          title="Alterar perfil"
          message={
            <>
              Alterar o perfil de <strong>{userLabel(pending.user)}</strong> de {ROLE_LABELS[pending.user.role]} para{" "}
              <strong>{ROLE_LABELS[pending.role]}</strong>?
            </>
          }
          busy={busy}
          onConfirm={changeRole}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}

export default function AdminUsuariosPage() {
  return (
    <AppShell adminOnly>
      <UsersAdmin />
    </AppShell>
  );
}
