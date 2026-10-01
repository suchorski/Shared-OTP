"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { api } from "@/lib/api";
import { userLabel } from "@/lib/format";

/** Searches users who have already logged in, by CPF, SARAM, nome de guerra or nome completo. */
export function UserPicker({ onSelect, excludeIds = [], filter, placeholder = "CPF, SARAM, nome de guerra ou nome completo" }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      setError("");
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api("/users/search", { query: { q: term } });
        if (!cancelled) {
          setResults(data);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const visible = results.filter((u) => !excludeIds.includes(u.id) && (!filter || filter(u)));

  return (
    <div>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input-field pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} autoFocus />
        {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
      </div>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      {q.trim().length >= 3 && !loading && !error && visible.length === 0 && (
        <p className="text-sm text-gray-500 mt-2">Ninguém encontrado. A pessoa precisa ter feito login ao menos uma vez.</p>
      )}
      {visible.length > 0 && (
        <ul className="mt-2 border rounded-lg divide-y max-h-64 overflow-y-auto">
          {visible.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(u);
                  setQ("");
                  setResults([]);
                }}
                className="w-full text-left px-3 py-2 hover:bg-blue-50"
              >
                <div className="font-medium text-sm">{userLabel(u)}</div>
                <div className="text-xs text-gray-500">
                  {u.name || "—"} · {u.om || "—"} · SARAM {u.saram || "—"} · CPF {u.cpfMasked || "—"}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
