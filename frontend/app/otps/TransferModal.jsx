"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { UserPicker } from "@/components/UserPicker";
import { userLabel } from "@/lib/format";

/** `admin` enables the keep-access option; `restrictOm` hides users outside a local admin's OM. */
export function TransferModal({ otp, onClose, onConfirm, admin = false, restrictOm = null }) {
  const [target, setTarget] = useState(null);
  const [keepAccess, setKeepAccess] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm(target, keepAccess);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`Transferir posse de “${otp.name}”`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn-danger" onClick={confirm} disabled={!target || busy}>Transferir</button>
        </>
      }
    >
      {!target ? (
        <>
          <p className="text-sm text-gray-600 mb-3">Escolha o novo dono.</p>
          <UserPicker
            onSelect={setTarget}
            excludeIds={[otp.owner?.id]}
            filter={restrictOm ? (u) => u.om === restrictOm : undefined}
          />
        </>
      ) : (
        <div className="space-y-3 text-sm">
          <p>
            A posse será transferida para <strong>{userLabel(target)}</strong> ({target.om || "—"}).
          </p>
          {admin ? (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={keepAccess} onChange={(e) => setKeepAccess(e.target.checked)} />
              Manter acesso de visualização do antigo dono ({userLabel(otp.owner)})
            </label>
          ) : (
            <p className="text-gray-600">
              Você continuará com acesso de visualização, mas não poderá mais editar, excluir ou compartilhar.
            </p>
          )}
          <button className="text-blue-900 underline" onClick={() => setTarget(null)} disabled={busy}>
            Escolher outra pessoa
          </button>
          {error && <p className="text-red-600">{error}</p>}
        </div>
      )}
    </Modal>
  );
}
