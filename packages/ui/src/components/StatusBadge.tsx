import React from "react";

export type SyncMode = "local" | "p2p" | "cloud";

export interface StatusBadgeProps {
  mode: SyncMode;
  isOnline: boolean;
  pendingChanges?: number;
}

export function StatusBadge({ mode, isOnline, pendingChanges = 0 }: StatusBadgeProps) {
  let badgeColor = "";
  let dotColor = "";
  let label = "";

  if (mode === "local") {
    badgeColor = "bg-amber-100 text-amber-800";
    dotColor = "bg-amber-500";
    label = "Lokal";
  } else if (mode === "p2p") {
    badgeColor = "bg-blue-100 text-blue-800";
    dotColor = "bg-blue-500";
    label = "P2P";
  } else if (mode === "cloud") {
    badgeColor = "bg-green-100 text-green-700";
    dotColor = "bg-green-500";
    label = "Awan";
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {label}
      {pendingChanges > 0 && (
        <span className="ml-1 flex items-center justify-center w-4 h-4 rounded-full bg-white bg-opacity-40 text-[10px] font-bold">
          {pendingChanges}
        </span>
      )}
    </div>
  );
}
