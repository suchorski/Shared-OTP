"use client";

import { ACTION_LABELS, formatDateTime, userLabel } from "@/lib/format";

function describeDetails(log) {
  const d = log.details || {};
  const parts = [];
  if (log.action === "ROLE_CHANGE") parts.push(`${d.from} → ${d.to}`);
  if (log.action === "OTP_UPDATE" && d.previousName && d.previousName !== log.otpName) parts.push(`antes: ${d.previousName}`);
  if (log.action === "OTP_UPDATE" && d.secretChanged) parts.push("segredo alterado");
  if (log.action === "OTP_TRANSFER") parts.push(d.keepPreviousOwnerAccess ? "antigo dono manteve acesso" : "antigo dono perdeu acesso");
  if (log.action === "LOGIN_FAILED") parts.push(d.reason === "not_found" ? "CPF não encontrado" : "senha inválida");
  if (d.asAdmin) parts.push("por admin");
  return parts.join(" · ");
}

export function AuditTable({ items, showOtp = true, showActor = true }) {
  if (!items.length) return <p className="text-sm text-gray-500 py-4">Nenhum registro.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>Data</th>
            {showActor && <th>Quem</th>}
            <th>Ação</th>
            {showOtp && <th>OTP</th>}
            <th>Alvo</th>
            <th>Detalhes</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {items.map((log) => (
            <tr key={log.id}>
              <td className="whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
              {showActor && (
                <td>
                  {log.actor ? userLabel(log.actor) : log.actorCpf ? `CPF ${log.actorCpf}` : "—"}
                  {log.actorOm && <div className="text-xs text-gray-500">{log.actorOm}</div>}
                </td>
              )}
              <td className="whitespace-nowrap">{ACTION_LABELS[log.action] || log.action}</td>
              {showOtp && <td>{log.otpName || "—"}</td>}
              <td>{log.targetUser ? userLabel(log.targetUser) : "—"}</td>
              <td className="text-gray-600">{describeDetails(log) || "—"}</td>
              <td className="text-gray-500 whitespace-nowrap">{log.ip || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
