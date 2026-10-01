"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { API_BASE, api, setToken } from "@/lib/api";
import { useAuth } from "./components/AuthProvider";

const TRUST_FLAG = "otp_trust_attempted";

function formatCpf(value) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, setUser } = useAuth();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiStatus, setApiStatus] = useState("checking");

  const liberarCertificado = useCallback(() => {
    try {
      sessionStorage.setItem(TRUST_FLAG, "1");
    } catch {
      // Ignora indisponibilidade do sessionStorage.
    }
    const retorno = window.location.origin + window.location.pathname;
    window.location.href = `${API_BASE}/trust?return=${encodeURIComponent(retorno)}`;
  }, []);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
        if (cancelado) return;
        if (response.ok) {
          setApiStatus("online");
          try {
            sessionStorage.removeItem(TRUST_FLAG);
          } catch {
            // Ignora indisponibilidade do sessionStorage.
          }
          return;
        }
        setApiStatus("offline");
      } catch {
        if (cancelado) return;
        setApiStatus("offline");
        let jaTentou = false;
        try {
          jaTentou = sessionStorage.getItem(TRUST_FLAG) === "1";
        } catch {
          // Ignora indisponibilidade do sessionStorage.
        }
        if (!jaTentou) liberarCertificado();
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [liberarCertificado]);

  useEffect(() => {
    if (!loading && user) router.replace("/otps");
  }, [loading, user, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/auth/login", { method: "POST", body: { cpf: cpf.replace(/\D/g, ""), password } });
      setToken(data.token);
      setUser(data.user);
      router.replace("/otps");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="FAB" className="h-20 w-20 object-contain mb-3" />
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <KeyRound size={20} className="text-blue-900" />
            OTP Compartilhado
          </h1>
          <p className="text-sm text-gray-500 mt-1">Acesse com seu CPF e senha da rede</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="cpf">CPF</label>
            <input
              id="cpf"
              className="input-field"
              inputMode="numeric"
              autoComplete="username"
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              placeholder="000.000.000-00"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              className="input-field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            Entrar
          </button>
        </form>
        <div className="mt-5 flex flex-col items-center gap-2 border-t border-gray-200 pt-4 text-xs">
          {apiStatus === "checking" && (
            <span className="flex items-center gap-1.5 text-gray-500">
              <Loader2 size={14} className="animate-spin" />
              Verificando conexão com o servidor...
            </span>
          )}
          {apiStatus === "online" && (
            <span className="flex items-center gap-1.5 text-green-700">
              <ShieldCheck size={14} />
              Servidor acessível
            </span>
          )}
          {apiStatus === "offline" && (
            <>
              <span className="flex items-center gap-1.5 text-red-600">
                <ShieldAlert size={14} />
                Servidor inacessível
              </span>
              <button
                type="button"
                onClick={liberarCertificado}
                className="font-semibold text-blue-800 underline hover:text-blue-950"
              >
                Liberar acesso seguro (aceitar certificado)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
