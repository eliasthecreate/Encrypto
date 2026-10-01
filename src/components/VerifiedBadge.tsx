import React from "react";
import { ShieldCheck, CheckCircle2 } from "lucide-react";

interface VerifiedBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
  domain?: string | null;
}

export function VerifiedBadge({
  size = "md",
  className = "",
  showTooltip = true,
  domain,
}: VerifiedBadgeProps) {
  const sizeMap = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const iconSize = sizeMap[size] || sizeMap.md;

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium group relative cursor-help text-emerald-400 ${className}`}
      title={showTooltip ? `Verified Student Credential (${domain || "University"})` : undefined}
    >
      <span className="relative flex items-center justify-center">
        <ShieldCheck className={`${iconSize} fill-emerald-500/20 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]`} />
      </span>
      {showTooltip && (
        <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1 text-xs font-sans text-emerald-200 bg-slate-900/95 border border-emerald-500/30 rounded-lg shadow-xl whitespace-nowrap z-50 backdrop-blur-md">
          <span className="flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Verified Student Credential
          </span>
          {domain && <span className="block text-[10px] text-emerald-400/80 font-mono mt-0.5">{domain}</span>}
        </span>
      )}
    </span>
  );
}
