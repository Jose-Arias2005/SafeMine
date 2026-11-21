"use client";

import React, { useId, useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
  idPrefix?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  ariaLabel = "Secciones",
  idPrefix,
}: TabsProps) {
  const autoId = useId();
  const prefix = idPrefix ?? autoId;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectAndFocus = (index: number) => {
    const nextTab = tabs[index];
    if (!nextTab) return;
    onChange(nextTab.id);
    const button = tabRefs.current[index];
    if (button) {
      button.focus();
      button.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (tabs.length === 0) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectAndFocus((index + 1) % tabs.length);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectAndFocus((index - 1 + tabs.length) % tabs.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      selectAndFocus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      selectAndFocus(tabs.length - 1);
    }
  };

  return (
    <div className="border-b border-slate-200">
      <div role="tablist" aria-label={ariaLabel} className="sm-tablist -mb-px">
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              id={`${prefix}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => {
                onChange(tab.id);
                tabRefs.current[index]?.scrollIntoView({
                  block: "nearest",
                  inline: "nearest",
                });
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`sm-tab inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-600 ${
                isActive
                  ? "text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.icon && (
                <span
                  aria-hidden="true"
                  className={isActive ? "text-blue-600" : "text-slate-400"}
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
