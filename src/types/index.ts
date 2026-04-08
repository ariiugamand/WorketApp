// Common shared types for WorketApp

export interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  info_json: Record<string, unknown> | null;
  birth_date?: string | null;
  hire_date?: string | null;
  user_id?: string | null;
  departments?: { name: string } | null;
}

export interface ScheduleEntry {
  id: string;
  employee_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  reason: string | null;
  replacement_employee_id: string | null;
}

export interface SchedulePreference {
  employee_id: string;
  date: string;
  preference_text: string;
}

export interface Event {
  id: string;
  event_type: string;
  title: string;
  date: string;
  time: string | null;
  importance: string;
  description: string | null;
  created_by: string | null;
}

export interface Task {
  id: string;
  task_type: string;
  title: string;
  description: string | null;
  start_date: string | null;
  due_date: string | null;
  progress_percent: number;
  status: string;
  assignee_id: string | null;
  created_by: string | null;
  employees?: { full_name: string } | null;
}

export interface Application {
  id: string;
  app_type: string;
  text: string;
  status: string;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
  employee_id: string;
  decided_by: string | null;
  employees?: { full_name: string; position: string | null } | null;
}

export interface Notification {
  id: string;
  text: string;
  is_read: boolean;
  created_at: string;
  events?: { title: string } | null;
}
