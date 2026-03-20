"use client";

import React from "react";

export interface CardProps {
  title: string;
  value?: string | number;
  unit?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({
  title,
  value,
  unit,
  icon,
  children,
  className = "",
  onClick,
}: CardProps) {
  const baseClasses = "rounded-xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col gap-2";
  const interactableClasses = onClick ? "cursor-pointer hover:shadow-md transition-shadow" : "";

  return (
    <div
      className={`${baseClasses} ${interactableClasses} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-3">
        {icon && <div className="text-stone-500">{icon}</div>}
        <h3 className="text-base font-semibold text-stone-800">{title}</h3>
      </div>
      {(value !== undefined || unit) && (
        <div className="flex items-end gap-1 mt-1">
          {value !== undefined && <span className="text-2xl font-bold text-stone-900">{value}</span>}
          {unit && <span className="text-sm font-medium text-stone-500 mb-1">{unit}</span>}
        </div>
      )}
      {children && <div className="mt-2 text-sm text-stone-600">{children}</div>}
    </div>
  );
}
