"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Eye, History, Loader2, Search, Shield, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { ConfirmModal } from "@/components/Modal";
import { CountdownRing } from "@/components/CountdownRing";
import { Pagination } from "@/components/Pagination";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { formatCode, formatDateTime, userLabel } from "@/lib/format";
import { TransferModal } from "../../otps/TransferModal";
import { HistoryModal } from "../../otps/HistoryModal";
import { OmSelect, useAdminOms, useQueryParams } from "../shared";

function RevealedCode({ value, onExpire }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  const remaining = Math.max(0, Math.ceil((value.expiresAt - now) / 1000));
  useEffect(() => {
    if (remaining === 0) onExpire();
  }, [remaining, onExpire]);

  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-lg">{formatCode(value.code)}</span>
      <CountdownRing remaining={remaining} period={value.period} size={28} />
    </span>
  );
}

function OtpsAdmin() {
  const { user: me } = useAuth();
  const notify = useToast();
  const isGlobal = me.role === "ADMIN_GLOBAL";
  const oms = useAdminOms();
  const params = useQueryParams();
  const [q, setQ] = useState("");
  const [om, setOm] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const userId = params?.userId || "";

  const load = useCallback(async () => {
    if (!params) return;
    try {
      setData(await api("/admin/otps", { query: { q: q.trim(), om, userId, page } }));
    } catch (err) {
      notify(err.message, "error");
    }
  }, [params, q, om, userId, page, notify]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  async function reveal(otp) {
    try {
      const c = await api(`/admin/otps/${otp.id}/code`);
      setRevealed((r) => ({ ...r, [otp.id]: { ...c, expiresAt: Date.now() + c.remaining * 1000 } }));
    } catch (err) {
      notify(err.message, "error");
    }
  }

  const hide = useCallback((id) => setRevealed(({ [id]: _, ...rest }) => rest), []);

  async function revoke() {
    const { otp, user } = modal;
    setBusy(true);
    try {
      await api(`/admin/otps/${otp.id}/shares/${user.id}`, { method: "DELETE" });
      notify(`Acesso de ${userLabel(user)} revogado`);
      setModal(null);
      load();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function transfer(otp, target, keepPreviousOwnerAccess) {
    await api(`/admin/otps/${otp.id}/transfer`, { method: "POST", body: { userId: target.id, keepPreviousOwnerAccess } });
    notify(`Posse transferida para ${userLabel(target)}`);
    setModal(null);
    load();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Shield className="text-blue-900" /> OTPs
          {!isGlobal && <span className="text-base font-normal text-gray-500">({me.om})</span>}
        </h1>
        <div className="flex w-full flex-col gap-2 lg:ml-auto lg:w-auto lg:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input-field pl-9 lg:w-64"
              placeholder="Nome do OTP ou do dono"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
            />
          </div>
          {isGlobal && <OmSelect value={om} onChange={(v) => { setOm(v); setPage(1); }} oms={oms} />}
        </div>
      </div>
      {userId && (
        <p className="text-sm text-gray-600 mb-3">
          Filtrando por um usuário (próprios e recebidos). <a href="/admin/otps" className="text-blue-900 underline">Limpar</a>
        </p>
      )}

      <div className="card overflow-x-auto">
        {!data ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <>
            <table className="table-base">
              <thead>
                <tr>
                  <th>OTP</th>
                  <th>Dono</th>
                  <th>Compartilhado com</th>
                  <th>Criado</th>
                  <th>Código</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((otp) => (
                  <tr key={otp.id}>
                    <td>
                      <div className="font-medium">{otp.name}</div>
                      {otp.issuer && <div className="text-xs text-gray-500">{otp.issuer}</div>}
                    </td>
                    <td>
                      {userLabel(otp.owner)}
                      <div className="text-xs text-gray-500">{otp.owner.om || "—"}</div>
                    </td>
                    <td>
                      {otp.shares.length === 0 ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {otp.shares.map((s) => (
                            <span key={s.user.id} className="inline-flex items-center gap-1 bg-gray-100 rounded-full pl-2 pr-1 py-0.5 text-xs">
                              {userLabel(s.user)}
                              <button
                                className="rounded-full hover:bg-red-100 text-red-700 p-0.5"
                                title="Revogar"
                                onClick={() => setModal({ type: "revoke", otp, user: s.user })}
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap">{formatDateTime(otp.createdAt)}</td>
                    <td className="whitespace-nowrap">
                      {revealed[otp.id] ? (
                        <RevealedCode value={revealed[otp.id]} onExpire={() => hide(otp.id)} />
                      ) : (
                        <button className="btn-secondary py-1 text-sm" onClick={() => reveal(otp)} title="A visualização é registrada na auditoria">
                          <Eye size={14} /> Revelar
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      <button className="btn-icon" title="Transferir posse" onClick={() => setModal({ type: "transfer", otp })}>
                        <ArrowRightLeft size={16} />
                      </button>
                      <button className="btn-icon" title="Histórico" onClick={() => setModal({ type: "history", otp })}>
                        <History size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </>
        )}
      </div>

      {modal?.type === "revoke" && (
        <ConfirmModal
          title="Revogar compartilhamento"
          message={
            <>
              Revogar o acesso de <strong>{userLabel(modal.user)}</strong> a <strong>{modal.otp.name}</strong>?
            </>
          }
          confirmLabel="Revogar"
          danger
          busy={busy}
          onConfirm={revoke}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "transfer" && (
        <TransferModal
          otp={modal.otp}
          admin
          restrictOm={isGlobal ? null : me.om}
          onClose={() => setModal(null)}
          onConfirm={(target, keep) => transfer(modal.otp, target, keep)}
        />
      )}
      {modal?.type === "history" && (
        <HistoryModal otp={modal.otp} path={`/admin/audit?otpId=${encodeURIComponent(modal.otp.id)}`} onClose={() => setModal(null)} />
      )}
    </>
  );
}

export default function AdminOtpsPage() {
  return (
    <AppShell adminOnly>
      <OtpsAdmin />
    </AppShell>
  );
}
