"use client";

import React from "react";

export interface NumberInputProps {
  label: string;
  id: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  error?: string;
  disabled?: boolean;
}

export function NumberInput({
  label,
  id,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  error,
  disabled = false,
}: NumberInputProps) {
  const handleMinus = () => {
    if (disabled) return;
    const newValue = value - step;
    if (min !== undefined && newValue < min) return;
    onChange(newValue);
  };

  const handlePlus = () => {
    if (disabled) return;
    const newValue = value + step;
    if (max !== undefined && newValue > max) return;
    onChange(newValue);
  };

  return (
    <div className="flex flex-col mb-4">
      <label htmlFor={id} className="text-sm font-medium text-stone-700 mb-1">
        {label}
      </label>
      <div className="flex flex-row items-center mt-1">
        <button
          type="button"
          onClick={handleMinus}
          disabled={disabled || (min !== undefined && value <= min)}
          className="min-h-12 min-w-12 bg-stone-100 border border-stone-300 rounded-lg text-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
          aria-label="Decrease value"
        >
          &minus;
        </button>
        <input
          id={id}
          type="number"
          value={value}
          onChange={(e) => {
            if (disabled) return;
            const parsed = parseFloat(e.target.value);
            if (!isNaN(parsed)) {
              onChange(parsed);
            }
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`min-h-12 w-24 mx-2 text-center text-lg font-semibold border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-700 ${
            error ? "border-red-500" : "border-stone-300"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-stone-50" : ""}`}
        />
        <button
          type="button"
          onClick={handlePlus}
          disabled={disabled || (max !== undefined && value >= max)}
          className="min-h-12 min-w-12 bg-stone-100 border border-stone-300 rounded-lg text-xl font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-200 transition-colors"
          aria-label="Increase value"
        >
          &#43;
        </button>
        {unit && <span className="text-sm text-stone-600 ml-3 self-center">{unit}</span>}
      </div>
      {error && <span className="text-sm text-red-600 mt-1">{error}</span>}
    </div>
  );
}
