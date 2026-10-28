"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FinancePageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 p-3 sm:gap-4 sm:p-5 lg:p-8",
        "bg-slate-50 dark:bg-slate-900/40 min-h-screen",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FinancePageHeader({
  breadcrumb,
  title,
  count,
  description,
  icon,
  actions,
  className = "",
}: {
  breadcrumb?: ReactNode;
  title: string;
  count?: number;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {breadcrumb && (
        <nav className="text-xs text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
          {breadcrumb}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 text-white shadow-md">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-lg">
              {title}
            </h1>
            {description && (
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400 sm:text-xs">
                {description}
              </p>
            )}
          </div>
          {typeof count === "number" && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {count}
            </span>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

export function FinanceStatCard({
  label,
  value,
  hint,
  icon,
  tone = "indigo",
  className = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "indigo" | "emerald" | "blue" | "amber" | "rose" | "slate" | "purple";
  className?: string;
}) {
  const toneMap: Record<string, string> = {
    indigo: "from-indigo-500 to-indigo-600",
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
    slate: "from-slate-500 to-slate-700",
    purple: "from-purple-500 to-purple-600",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gradient-to-br opacity-10 blur-xl transition-transform group-hover:scale-110" />
      <div className="relative flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
            {value}
          </p>
          {hint && (
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              {hint}
            </p>
          )}
        </div>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-sm",
              toneMap[tone]
            )}
          >
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export function FinanceTableCard({
  children,
  title,
  description,
  className = "",
}: {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      {(title || description) && (
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          {title && (
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:text-base">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function FinanceEmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-4 py-12 text-center",
        className
      )}
    >
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {title}
      </p>
      {description && (
        <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
