"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Copy, History, KeyRound, Loader2, Pencil, Plus, Search, Share2, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ConfirmModal } from "@/components/Modal";
import { CountdownRing } from "@/components/CountdownRing";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { formatCode, userLabel } from "@/lib/format";
import { useOtpCodes } from "@/lib/useOtpCodes";
import { OtpFormModal } from "./OtpFormModal";
import { ShareModal } from "./ShareModal";
import { TransferModal } from "./TransferModal";
import { HistoryModal } from "./HistoryModal";

function OtpCard({ otp, code, onAction, onCopy }) {
  const isOwner = otp.access === "owner";
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate" title={otp.name}>{otp.name}</h3>
          {otp.issuer && <p className="text-xs text-gray-500 truncate">{otp.issuer}</p>}
        </div>
        {isOwner ? (
          otp.shareCount > 0 && (
            <span className="text-xs bg-blue-50 text-blue-900 rounded-full px-2 py-0.5 flex items-center gap-1 shrink-0">
              <Users size={12} /> {otp.shareCount}
            </span>
          )
        ) : (
          <span className="text-xs bg-amber-50 text-amber-800 rounded-full px-2 py-0.5 shrink-0">Compartilhado</span>
        )}
      </div>

      <button
        onClick={() => code && onCopy(otp, code.code)}
        className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 hover:bg-blue-50 px-3 py-2 group"
        title="Clique para copiar"
      >
        <span className="font-mono text-3xl tracking-wider text-blue-950">{code ? formatCode(code.code) : "··· ···"}</span>
        <span className="flex items-center gap-2">
          <Copy size={16} className="text-gray-400 group-hover:text-blue-900" />
          {code && <CountdownRing remaining={code.remaining} period={code.period} />}
        </span>
      </button>

      {!isOwner && (
        <p className="text-xs text-gray-500">
          Dono: {userLabel(otp.owner)}
          {otp.sharedBy && otp.sharedBy.id !== otp.owner.id && <> · compartilhado por {userLabel(otp.sharedBy)}</>}
        </p>
      )}

      {isOwner && (
        <div className="flex items-center gap-1 border-t pt-2 -mb-1">
          <button className="btn-icon" title="Compartilhar" onClick={() => onAction("share", otp)}><Share2 size={16} /></button>
          <button className="btn-icon" title="Transferir posse" onClick={() => onAction("transfer", otp)}><ArrowRightLeft size={16} /></button>
          <button className="btn-icon" title="Histórico" onClick={() => onAction("history", otp)}><History size={16} /></button>
          <button className="btn-icon" title="Editar" onClick={() => onAction("edit", otp)}><Pencil size={16} /></button>
          <button className="btn-icon ml-auto text-red-700" title="Excluir" onClick={() => onAction("delete", otp)}><Trash2 size={16} /></button>
        </div>
      )}
    </div>
  );
}

export default function OtpsPage() {
  const notify = useToast();
  const [otps, setOtps] = useState(null);
  const [filter, setFilter] = useState("");
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const codes = useOtpCodes(otps !== null, reloadKey);

  const load = useCallback(async () => {
    try {
      setOtps(await api("/otps"));
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err.message, "error");
      setOtps([]);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const close = () => setModal(null);
  const closeAndReload = () => {
    setModal(null);
    load();
  };

  async function copy(otp, code) {
    try {
      await navigator.clipboard.writeText(code);
      notify(`Código de “${otp.name}” copiado`);
    } catch {
      notify("Não foi possível copiar. Copie manualmente.", "error");
      return;
    }
    api(`/otps/${otp.id}/copy`, { method: "POST" }).catch(() => {});
  }

  async function remove(otp) {
    setBusy(true);
    try {
      await api(`/otps/${otp.id}`, { method: "DELETE" });
      notify("OTP excluído");
      closeAndReload();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function transfer(otp, target) {
    await api(`/otps/${otp.id}/transfer`, { method: "POST", body: { userId: target.id } });
    notify(`Posse transferida para ${userLabel(target)}`);
    closeAndReload();
  }

  const term = filter.trim().toLowerCase();
  const visible = (otps || []).filter(
    (o) => !term || o.name.toLowerCase().includes(term) || (o.issuer || "").toLowerCase().includes(term)
  );
  const owned = visible.filter((o) => o.access === "owner");
  const shared = visible.filter((o) => o.access === "viewer");

  const renderGrid = (list) => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((otp) => (
        <OtpCard key={otp.id} otp={otp} code={codes.get(otp.id)} onCopy={copy} onAction={(type, o) => setModal({ type, otp: o })} />
      ))}
    </div>
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <KeyRound className="text-blue-900" /> Meus OTPs
        </h1>
        <div className="flex w-full flex-col gap-2 lg:ml-auto lg:w-auto lg:flex-row">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input-field pl-9 lg:w-64" placeholder="Filtrar" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={() => setModal({ type: "create" })}>
            <Plus size={16} /> Novo OTP
          </button>
        </div>
      </div>

      {otps === null ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : otps.length === 0 ? (
        <div className="card text-center text-gray-500 py-12">
          Nenhum OTP ainda. Clique em <strong>Novo OTP</strong> para cadastrar o primeiro.
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Meus ({owned.length})</h2>
            {owned.length ? renderGrid(owned) : <p className="text-sm text-gray-500">Nenhum.</p>}
          </section>
          {shared.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Compartilhados comigo ({shared.length})</h2>
              {renderGrid(shared)}
            </section>
          )}
        </div>
      )}

      {modal?.type === "create" && <OtpFormModal onClose={close} onSaved={() => { notify("OTP criado"); closeAndReload(); }} />}
      {modal?.type === "edit" && <OtpFormModal otp={modal.otp} onClose={close} onSaved={() => { notify("OTP atualizado"); closeAndReload(); }} />}
      {modal?.type === "share" && <ShareModal otp={modal.otp} onClose={close} onChanged={load} />}
      {modal?.type === "transfer" && <TransferModal otp={modal.otp} onClose={close} onConfirm={(target) => transfer(modal.otp, target)} />}
      {modal?.type === "history" && <HistoryModal otp={modal.otp} path={`/otps/${modal.otp.id}/audit`} onClose={close} />}
      {modal?.type === "delete" && (
        <ConfirmModal
          title="Excluir OTP"
          message={
            <>
              Excluir <strong>{modal.otp.name}</strong>? Todos os compartilhamentos serão removidos. O histórico de auditoria é mantido.
            </>
          }
          confirmLabel="Excluir"
          danger
          busy={busy}
          onConfirm={() => remove(modal.otp)}
          onClose={close}
        />
      )}
    </AppShell>
  );
}
