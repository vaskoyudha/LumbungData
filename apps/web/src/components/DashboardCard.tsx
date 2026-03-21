'use client';

interface DashboardCardProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
  'data-testid'?: string;
}

export function DashboardCard({ icon, value, label, sublabel, 'data-testid': testId }: DashboardCardProps) {
  return (
    <div
      data-testid={testId}
      className="flex min-h-[80px] flex-col items-center justify-center gap-1 rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
    >
      <span className="text-2xl" role="img" aria-label={label}>
        {icon}
      </span>
      <span className="text-2xl font-bold text-stone-900">{value}</span>
      <span className="text-xs text-stone-500">{label}</span>
      {sublabel !== undefined && (
        <span className="text-[10px] text-stone-400">{sublabel}</span>
      )}
    </div>
  );
}
