"use client";

import React from "react";

export interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  showBack = false,
  onBack,
  action,
}: PageHeaderProps) {
  return (
    <header className="w-full bg-green-700 text-white px-4 py-3 flex items-center gap-3">
      {showBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="min-h-12 min-w-12 flex items-center justify-center rounded-full hover:bg-green-600 transition-colors -ml-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <h1 className="flex-1 text-lg font-bold text-white">{title}</h1>
      {action && <div className="ml-auto">{action}</div>}
    </header>
  );
}
