import { cn } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/utils-crm";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CLASSES: Record<string, string> = {
  new: "badge-new",
  approved: "badge-approved",
  rejected: "badge-rejected",
  in_progress: "badge-in-progress",
  completed: "badge-completed",
  overdue: "badge-overdue",
  scheduled: "badge-scheduled",
  cancelled: "badge-cancelled",
  day_off: "badge-day-off",
  transferred: "badge-transferred",
  reduced: "badge-reduced",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const badgeClass = STATUS_CLASSES[status] || "badge-day-off";
  const label = STATUS_LABELS[status] || status;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      badgeClass,
      className
    )}>
      {label}
    </span>
  );
}
