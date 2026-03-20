import React from "react";

export interface InputProps {
  label: string;
  id: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Input({
  label,
  id,
  value,
  defaultValue,
  onChange,
  placeholder,
  error,
  type = "text",
  required = false,
  disabled = false,
  className = "",
}: InputProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-stone-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`min-h-12 w-full px-4 py-3 text-base border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors ${
          error ? "border-red-500" : "border-stone-300"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-stone-50" : ""}`}
      />
      {error && <span className="text-sm text-red-600 mt-1">{error}</span>}
    </div>
  );
}
