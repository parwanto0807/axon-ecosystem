"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShieldAlert, Loader2, ArrowLeft } from "lucide-react";
import {
  canItOsl,
  isItOslRole,
  normalizeItOslRole,
  type ItOslAction,
} from "@/lib/itOslPermissions";

/**
 * Membatasi akses halaman modul IT-OSL berdasarkan role login dan (opsional)
 * aksi yang dibutuhkan halaman tersebut.
 *
 * Backend tetap memverifikasi setiap request; guard ini hanya UX.
 */
export function ItOslAccessGuard({
  children,
  action = "view",
}: {
  children: React.ReactNode;
  action?: ItOslAction;
}) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (status === "loading") {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 size={22} className="animate-spin text-indigo-600" />
        <p className="text-xs font-bold uppercase tracking-widest">Memeriksa hak akses…</p>
      </div>
    );
  }

  const roleAllowed = Boolean(session) && isItOslRole(role);
  const actionAllowed = roleAllowed && canItOsl(role, action);

  if (!actionAllowed) {
    return (
      <div className="p-6 sm:p-10 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-rose-100 shadow-sm p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert size={22} />
          </div>
          <h1 className="text-base font-black text-slate-900">Akses Ditolak</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            {roleAllowed
              ? "Role Anda tidak memiliki izin untuk membuka halaman ini."
              : "Modul IT Maintenance hanya untuk tim IT."}{" "}
            Akun Anda
            {role ? (
              <>
                {" "}
                memiliki role{" "}
                <span className="font-mono font-bold text-slate-700">
                  {normalizeItOslRole(role)}
                </span>
                .
              </>
            ) : null}{" "}
            Hubungi Administrator bila Anda memerlukan akses.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
          >
            <ArrowLeft size={14} /> Kembali ke Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
