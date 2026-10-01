"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { History, KeyRound, Loader2, LogOut, ScrollText, Shield, Users } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { isAdmin, ROLE_LABELS, userLabel } from "@/lib/format";

function NavLink({ href, icon: Icon, children }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active ? "bg-white/15 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon size={16} />
      {children}
    </Link>
  );
}

export function AppShell({ children, adminOnly = false }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (adminOnly && !isAdmin(user)) router.replace("/otps");
  }, [loading, user, adminOnly, router]);

  if (loading || !user || (adminOnly && !isAdmin(user))) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
          <Link href="/otps" className="flex items-center gap-2 font-semibold text-lg mr-4">
            <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
            OTP Compartilhado
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink href="/otps" icon={KeyRound}>Meus OTPs</NavLink>
            <NavLink href="/atividades" icon={History}>Minhas atividades</NavLink>
            {isAdmin(user) && (
              <>
                <span className="mx-2 h-5 w-px bg-white/30" />
                <NavLink href="/admin/usuarios" icon={Users}>Usuários</NavLink>
                <NavLink href="/admin/otps" icon={Shield}>OTPs</NavLink>
                <NavLink href="/admin/auditoria" icon={ScrollText}>Auditoria</NavLink>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <div className="text-right leading-tight">
              <div className="font-medium">{userLabel(user)}</div>
              <div className="text-blue-200 text-xs">
                {user.om || "—"} · {ROLE_LABELS[user.role]}
              </div>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-white/10" title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
