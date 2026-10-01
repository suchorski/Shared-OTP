"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";

export function OtpFormModal({ otp, onClose, onSaved }) {
  const editing = Boolean(otp);
  const [form, setForm] = useState({ name: otp?.name || "", secret: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (editing) await api(`/otps/${otp.id}`, { method: "PUT", body: form });
      else await api("/otps", { method: "POST", body: form });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title={editing ? "Editar OTP" : "Novo OTP"}
      onClose={onClose}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={busy}>Cancelar</button>
          <button className="btn-primary" form="otp-form" type="submit" disabled={busy}>Salvar</button>
        </>
      }
    >
      <form id="otp-form" onSubmit={submit} className="space-y-4" autoComplete="off">
        <div>
          <label className="label">Nome *</label>
          <input className="input-field" value={form.name} onChange={set("name")} maxLength={100} required autoFocus />
        </div>
        <div>
          <label className="label">Chave secreta (base32) {editing ? "" : "*"}</label>
          <input
            className="input-field font-mono"
            value={form.secret}
            onChange={set("secret")}
            required={!editing}
            placeholder={editing ? "Deixe em branco para manter a atual" : "Ex.: JBSW Y3DP EHPK 3PXP"}
            spellCheck={false}
          />
          <p className="text-xs text-gray-500 mt-1">
            É a chave exibida ao configurar o autenticador (opção “inserir chave manualmente”). Ela é armazenada criptografada e nunca é exibida novamente.
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
