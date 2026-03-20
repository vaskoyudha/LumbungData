import React from "react";

export interface SelectProps {
  label: string;
  id: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Select({
  label,
  id,
  value,
  defaultValue,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  placeholder,
}: SelectProps) {
  return (
    <div className="flex flex-col mb-4">
      <label htmlFor={id} className="text-sm font-medium text-stone-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`min-h-12 w-full px-4 py-3 text-base border rounded-lg bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors ${
            error ? "border-red-500" : "border-stone-300"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-stone-50" : ""}`}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      {error && <span className="text-sm text-red-600 mt-1">{error}</span>}
    </div>
  );
}
