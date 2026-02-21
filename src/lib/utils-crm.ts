export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type StatusBadgeVariant = 
  | "new" | "approved" | "rejected" | "in_progress" | "completed" 
  | "overdue" | "scheduled" | "cancelled" | "day_off" | "transferred" | "reduced";

export const STATUS_LABELS: Record<string, string> = {
  new: "Новое",
  approved: "Одобрено",
  rejected: "Отклонено",
  in_progress: "В работе",
  completed: "Завершено",
  overdue: "Просрочено",
  scheduled: "Запланировано",
  cancelled: "Отменено",
  day_off: "Выходной",
  transferred: "Перенесено",
  reduced: "Сокращено",
  low: "Низкая",
  medium: "Средняя",
  high: "Высокая",
  critical: "Критическая",
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-warning",
  high: "text-destructive",
  critical: "text-destructive font-bold",
};

export const TASK_TYPES = [
  "Планирование", "Обучение", "Отчётность", "Совещание", "Проверка", "Другое"
];

export const EVENT_TYPES = [
  "Совещание", "Тренинг", "Инструктаж", "Праздник", "Дедлайн", "Другое"
];

export const APP_TYPES = [
  "Отпуск", "Больничный", "Командировка", "Перенос смены", "Другое"
];

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "—";
  return timeStr.slice(0, 5);
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
