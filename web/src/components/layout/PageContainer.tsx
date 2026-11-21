import React from "react";

interface PageContainerProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export default function PageContainer({
  title,
  subtitle,
  actions,
  children,
}: PageContainerProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1
            id="page-heading"
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl focus:outline-none"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
