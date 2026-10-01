"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { UserPicker } from "@/components/UserPicker";
import { useToast } from "@/components/Toast";
import { api } from "@/lib/api";
import { formatDateTime, userLabel } from "@/lib/format";

export function ShareModal({ otp, onClose, onChanged }) {
  const notify = useToast();
  const [shares, setShares] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setShares(await api(`/otps/${otp.id}/shares`));
    } catch (err) {
      notify(err.message, "error");
    }
  }, [otp.id, notify]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn, message) {
    setBusy(true);
    try {
      await fn();
      notify(message);
      await load();
      onChanged();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  const add = (user) =>
    run(() => api(`/otps/${otp.id}/shares`, { method: "POST", body: { userId: user.id } }), `Compartilhado com ${userLabel(user)}`);

  const revoke = (user) =>
    run(() => api(`/otps/${otp.id}/shares/${user.id}`, { method: "DELETE" }), `Acesso de ${userLabel(user)} revogado`);

  return (
    <Modal title={`Compartilhar “${otp.name}”`} onClose={onClose} size="lg">
      <p className="text-sm text-gray-600 mb-3">
        Quem receber poderá apenas visualizar e copiar o código. Você pode revogar a qualquer momento.
      </p>
      <UserPicker onSelect={add} excludeIds={(shares || []).map((s) => s.user.id)} />

      <h3 className="font-medium mt-6 mb-2">Com acesso</h3>
      {!shares ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-gray-400" /></div>
      ) : shares.length === 0 ? (
        <p className="text-sm text-gray-500">Ainda não compartilhado.</p>
      ) : (
        <ul className="divide-y border rounded-lg">
          {shares.map((s) => (
            <li key={s.user.id} className="flex items-center justify-between px-3 py-2">
              <div>
                <div className="text-sm font-medium">{userLabel(s.user)}</div>
                <div className="text-xs text-gray-500">
                  {s.user.om || "—"} · desde {formatDateTime(s.createdAt)}
                </div>
              </div>
              <button className="btn-icon text-red-700" onClick={() => revoke(s.user)} disabled={busy} title="Revogar">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
