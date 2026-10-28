/**
 * Matriks hak akses modul IT-OSL (selaras dengan backend/utils/itOslRbac.js
 * dan PRD-IT-OSL-v2 §2.2).
 *
 * Catatan: ini hanya untuk UX (menyembunyikan tombol). Keputusan keamanan
 * tetap di backend — menyembunyikan tombol bukan kontrol akses.
 */

export type ItOslAction =
  | "view"
  | "master.write"
  | "asset.write"
  | "pic.write"
  | "ticket.create"
  | "ticket.edit"
  | "ticket.assign"
  | "ticket.close"
  | "ticket.cancel"
  | "ticket.delete"
  | "pm.plan"
  | "pm.execute"
  | "handover"
  | "report.full"
  | "audit.view";

export const IT_OSL_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "OPERATIONAL",
  "STAFF",
] as const;

const MATRIX: Record<ItOslAction, readonly string[]> = {
  view: [...IT_OSL_ROLES],
  "master.write": ["SUPER_ADMIN", "ADMIN"],
  "asset.write": [...IT_OSL_ROLES],
  "pic.write": [...IT_OSL_ROLES],
  "ticket.create": [...IT_OSL_ROLES],
  "ticket.edit": [...IT_OSL_ROLES],
  "ticket.assign": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "ticket.close": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "ticket.cancel": ["SUPER_ADMIN", "ADMIN"],
  "ticket.delete": ["SUPER_ADMIN"],
  "pm.plan": ["SUPER_ADMIN", "ADMIN"],
  "pm.execute": ["SUPER_ADMIN", "ADMIN", "MANAGER", "OPERATIONAL"],
  handover: [...IT_OSL_ROLES],
  "report.full": ["SUPER_ADMIN", "ADMIN", "MANAGER"],
  "audit.view": ["SUPER_ADMIN", "ADMIN"],
};

export function normalizeItOslRole(role?: string | null): string {
  return String(role || "").trim().toUpperCase();
}

export function isItOslRole(role?: string | null): boolean {
  return (IT_OSL_ROLES as readonly string[]).includes(normalizeItOslRole(role));
}

export function canItOsl(role: string | null | undefined, action: ItOslAction): boolean {
  const normalized = normalizeItOslRole(role);
  return MATRIX[action]?.includes(normalized) ?? false;
}
