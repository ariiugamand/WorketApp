import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, showLabel = true }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  
  const getColor = () => {
    if (clampedValue === 100) return "bg-success";
    if (clampedValue >= 70) return "bg-accent";
    if (clampedValue >= 40) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={cn("h-2 rounded-full transition-all duration-300", getColor())}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground w-9 text-right">
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
