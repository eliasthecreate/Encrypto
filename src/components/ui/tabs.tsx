import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn("w-full", className)} data-value={value}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            _activeValue: value,
            _onValueChange: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  _activeValue?: string;
  _onValueChange?: (value: string) => void;
}

function TabsList({
  children,
  className,
  _activeValue,
  _onValueChange,
}: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 bg-muted/50 p-1 rounded-2xl",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            _activeValue,
            _onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  _activeValue?: string;
  _onValueChange?: (value: string) => void;
}

function TabsTrigger({
  value,
  children,
  className,
  _activeValue,
  _onValueChange,
}: TabsTriggerProps) {
  const isActive = _activeValue === value;
  return (
    <button
      onClick={() => _onValueChange?.(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  _activeValue?: string;
}

function TabsContent({
  value,
  children,
  className,
  _activeValue,
}: TabsContentProps) {
  if (_activeValue !== value) return null;
  return <div className={cn("mt-2", className)}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
