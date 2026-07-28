import * as React from "react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

interface AvatarProps {
  src?: string;
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  status?: "online" | "offline" | "away" | "busy";
  showStatus?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-3xl",
};

const statusSizeClasses = {
  sm: "h-2.5 w-2.5 right-0 bottom-0",
  md: "h-3 w-3 right-0 bottom-0",
  lg: "h-3.5 w-3.5 right-0.5 bottom-0.5",
  xl: "h-4 w-4 right-0.5 bottom-0.5",
  "2xl": "h-5 w-5 right-1 bottom-1",
};

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
  away: "bg-yellow-500",
  busy: "bg-red-500",
};

function Avatar({
  src,
  name,
  size = "md",
  className,
  status,
  showStatus,
}: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className="relative inline-flex shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover border-2 border-white shadow-md",
            sizeClasses[size],
            className
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-full bg-gradient-to-br from-campus-400 to-campus-600 flex items-center justify-center text-white font-semibold border-2 border-white shadow-md",
            sizeClasses[size],
            className
          )}
        >
          {initials}
        </div>
      )}
      {showStatus && status && (
        <span
          className={cn(
            "absolute rounded-full border-2 border-white",
            statusSizeClasses[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  );
}

export { Avatar };
