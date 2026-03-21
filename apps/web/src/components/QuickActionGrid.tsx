'use client';

import Link from 'next/link';

interface QuickAction {
  icon: string;
  label: string;
  href: string;
  'data-testid'?: string;
}

interface QuickActionGridProps {
  actions: QuickAction[];
}

export function QuickActionGrid({ actions }: QuickActionGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          data-testid={action['data-testid'] ?? 'quick-action'}
          className="flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md active:bg-stone-50"
        >
          <span className="text-3xl" role="img" aria-label={action.label}>
            {action.icon}
          </span>
          <span className="text-sm font-medium text-stone-700">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
