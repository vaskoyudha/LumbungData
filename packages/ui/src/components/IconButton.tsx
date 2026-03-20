"use client";

import React from "react";

export interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "ghost";
  disabled?: boolean;
  className?: string;
}

export function IconButton({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
  className = "",
}: IconButtonProps) {
  const variantClasses = {
    default: "bg-green-700 text-white hover:bg-green-800",
    ghost: "bg-transparent text-stone-600 hover:bg-stone-100",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`min-h-12 min-w-12 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
    >
      {icon}
    </button>
  );
}
