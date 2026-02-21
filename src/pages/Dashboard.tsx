import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/auth";
import { Users, CalendarDays, ClipboardList, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { formatDate } from "@/lib/utils-crm";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalEmployees: number;
  pendingApplications: number;
  totalTasks: number;
  completedTasks: number;
  upcomingEvents: number;
  overdueTasks: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0, pendingApplications: 0, totalTasks: 0,
    completedTasks: 0, upcomingEvents: 0, overdueTasks: 0
  });
  const [recentApplications, setRecentApplications] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setUserName(u.full_name || u.login || ""); });
    loadData();
  }, []);

  const loadData = async () => {
    const [emps, apps, tasks, events] = await Promise.all([
      supabase.from("employees").select("id", { count: "exact" }),
      supabase.from("applications").select("id,status", { count: "exact" }),
      supabase.from("tasks").select("id,title,status,progress_percent,due_date", { count: "exact" }).order("created_at", { ascending: false }).limit(5),
      supabase.from("events").select("id", { count: "exact" }).gte("date", new Date().toISOString().split("T")[0]),
    ]);

    const allApps = await supabase.from("applications").select("*, employees(full_name,position)").eq("status", "new").order("created_at", { ascending: false }).limit(5);

    setStats({
      totalEmployees: emps.count || 0,
      pendingApplications: (apps.data || []).filter((a: any) => a.status === "new").length,
      totalTasks: tasks.count || 0,
      completedTasks: (tasks.data || []).filter((t: any) => t.status === "completed").length,
      upcomingEvents: events.count || 0,
      overdueTasks: (tasks.data || []).filter((t: any) => t.status === "overdue").length,
    });
    setRecentApplications(allApps.data || []);
    setRecentTasks(tasks.data || []);
    setLoading(false);
  };

  const statCards = [
    { label: "Сотрудников", value: stats.totalEmployees, icon: Users, color: "text-accent", bg: "bg-accent/10", href: "/employees" },
    { label: "Новых заявлений", value: stats.pendingApplications, icon: FileText, color: "text-warning", bg: "bg-warning/10", href: "/applications" },
    { label: "Предстоящих событий", value: stats.upcomingEvents, icon: CalendarDays, color: "text-info", bg: "bg-info/10", href: "/events" },
    { label: "Всего задач", value: stats.totalTasks, icon: ClipboardList, color: "text-primary", bg: "bg-primary-muted", href: "/tasks" },
  ];

  return (
    <AppLayout title="Главная — Сводка">
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Welcome */}
          <div className="bg-gradient-to-r from-primary to-primary-light rounded-xl p-6 text-primary-foreground">
            <h2 className="text-xl font-bold">Добро пожаловать{userName ? `, ${userName}` : ""}!</h2>
            <p className="text-primary-foreground/80 text-sm mt-1">
              {new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(c => (
              <div
                key={c.label}
                className="bg-card border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(c.href)}
              >
                <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
                <p className="text-muted-foreground text-sm">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Task status summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success flex-shrink-0" />
              <div>
                <p className="text-xl font-bold">{stats.completedTasks}</p>
                <p className="text-sm text-muted-foreground">Завершено задач</p>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-warning flex-shrink-0" />
              <div>
                <p className="text-xl font-bold">{stats.totalTasks - stats.completedTasks - stats.overdueTasks}</p>
                <p className="text-sm text-muted-foreground">В работе</p>
              </div>
            </div>
            <div className="bg-card border rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-destructive flex-shrink-0" />
              <div>
                <p className="text-xl font-bold">{stats.overdueTasks}</p>
                <p className="text-sm text-muted-foreground">Просрочено</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent applications */}
            <div className="bg-card border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Новые заявления</h3>
                <button onClick={() => navigate("/applications")} className="text-xs text-primary hover:underline">Все →</button>
              </div>
              {recentApplications.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Нет новых заявлений</p>
              ) : (
                <div className="space-y-3">
                  {recentApplications.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded" onClick={() => navigate(`/applications/${a.id}`)}>
                      <div>
                        <p className="text-sm font-medium">{a.employees?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{a.app_type} · {formatDate(a.created_at)}</p>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent tasks */}
            <div className="bg-card border rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Последние задачи</h3>
                <button onClick={() => navigate("/tasks")} className="text-xs text-primary hover:underline">Все →</button>
              </div>
              {recentTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Нет задач</p>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((t: any) => (
                    <div key={t.id} className="py-2 border-b last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded" onClick={() => navigate(`/tasks/${t.id}`)}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate flex-1 mr-2">{t.title}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <ProgressBar value={t.progress_percent} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
