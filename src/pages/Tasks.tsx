import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { TASK_TYPES, formatDate, daysUntil, getCurrentMonthStr } from "@/lib/utils-crm";
import { Plus, Edit2, Trash2, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { Slider } from "@/components/ui/slider";

interface Task {
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

interface Employee { id: string; full_name: string; }

const emptyForm = { task_type: TASK_TYPES[0], title: "", description: "", start_date: "", due_date: "", assignee_id: "" };

export default function Tasks() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthStr, setMonthStr] = useState(getCurrentMonthStr());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [progressDialog, setProgressDialog] = useState<{ open: boolean; task?: Task; value: number }>({ open: false, value: 0 });
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setCurrentUserId(u.id); });
    supabase.from("employees").select("id,full_name").then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => { loadTasks(); }, [monthStr]);

  const loadTasks = async () => {
    setLoading(true);
    const [y, m] = monthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const { data } = await supabase
      .from("tasks")
      .select("*, employees(full_name)")
      .or(`start_date.gte.${monthStr}-01,due_date.gte.${monthStr}-01,start_date.is.null`)
      .order("due_date", { nullsFirst: false })
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditTask(null);
    setForm({ ...emptyForm, start_date: new Date().toISOString().split("T")[0] });
    setFormOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({ task_type: t.task_type, title: t.title, description: t.description || "", start_date: t.start_date || "", due_date: t.due_date || "", assignee_id: t.assignee_id || "" });
    setFormOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) { toast({ title: "Введите название", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      task_type: form.task_type, title: form.title, description: form.description || null,
      start_date: form.start_date || null, due_date: form.due_date || null,
      assignee_id: form.assignee_id || null, created_by: currentUserId,
      status: "new", updated_at: new Date().toISOString()
    };
    let error;
    if (editTask) {
      ({ error } = await supabase.from("tasks").update({ ...payload, status: editTask.status }).eq("id", editTask.id));
    } else {
      ({ error } = await supabase.from("tasks").insert(payload));
    }
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: editTask ? "Задача обновлена" : "Задача создана" }); setFormOpen(false); loadTasks(); }
    setSaving(false);
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Удалить задачу?")) return;
    await supabase.from("tasks").delete().eq("id", id);
    toast({ title: "Задача удалена" });
    loadTasks();
  };

  const updateProgress = async () => {
    const { task, value } = progressDialog;
    if (!task) return;
    const newStatus = value === 100 ? "completed" : value > 0 ? "in_progress" : task.status === "overdue" ? "overdue" : "new";
    await supabase.from("tasks").update({ progress_percent: value, status: newStatus, updated_at: new Date().toISOString() }).eq("id", task.id);
    toast({ title: "Прогресс обновлён" });
    setProgressDialog({ open: false, value: 0 });
    loadTasks();
  };

  const changeMonth = (dir: number) => {
    const [y, m] = monthStr.split("-").map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    setMonthStr(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`);
  };

  const filteredTasks = filterStatus === "all" ? tasks : tasks.filter(t => t.status === filterStatus);

  const statusOptions = [
    { value: "all", label: "Все" },
    { value: "new", label: "Новые" },
    { value: "in_progress", label: "В работе" },
    { value: "completed", label: "Завершённые" },
    { value: "overdue", label: "Просроченные" },
  ];

  return (
    <AppLayout title="Задачи и планы">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-semibold text-sm min-w-32 text-center">
              {new Date(monthStr + "-01").toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {statusOptions.map(o => (
              <Button key={o.value} variant={filterStatus === o.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(o.value)}>
                {o.label}
              </Button>
            ))}
          </div>
          <Button className="ml-auto gap-2" onClick={openCreate}><Plus className="w-4 h-4" />Новая задача</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">Задач не найдено</div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map(t => {
              const remaining = daysUntil(t.due_date);
              return (
                <div key={t.id} className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs bg-primary-muted text-primary px-2 py-0.5 rounded-full">{t.task_type}</span>
                        <StatusBadge status={t.status} />
                        {remaining !== null && (
                          <span className={`text-xs ${remaining < 0 ? "text-destructive" : remaining <= 3 ? "text-warning" : "text-muted-foreground"}`}>
                            {remaining < 0 ? `Просрочено на ${Math.abs(remaining)} д.` : remaining === 0 ? "Сегодня дедлайн!" : `Осталось ${remaining} дн.`}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold">{t.title}</h3>
                      {t.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {t.start_date && <span>Начало: {formatDate(t.start_date)}</span>}
                        {t.due_date && <span>Дедлайн: {formatDate(t.due_date)}</span>}
                        {t.employees && <span>Исполнитель: {t.employees.full_name}</span>}
                      </div>
                      <div className="mt-3">
                        <ProgressBar value={t.progress_percent} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setProgressDialog({ open: true, task: t, value: t.progress_percent })}>
                        <TrendingUp className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(t)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => deleteTask(t.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editTask ? "Редактировать задачу" : "Новая задача"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Тип задачи</Label>
                <Select value={form.task_type} onValueChange={v => setForm(p => ({ ...p, task_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Исполнитель</Label>
                <Select value={form.assignee_id} onValueChange={v => setForm(p => ({ ...p, assignee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Название *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Название задачи" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Дата начала</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div>
                <Label>Дедлайн</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Описание задачи..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            <Button onClick={saveTask} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress dialog */}
      <Dialog open={progressDialog.open} onOpenChange={open => setProgressDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Обновить прогресс</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm font-medium">{progressDialog.task?.title}</p>
            <div className="space-y-3">
              <ProgressBar value={progressDialog.value} />
              <Slider
                value={[progressDialog.value]}
                onValueChange={([v]) => setProgressDialog(p => ({ ...p, value: v }))}
                min={0} max={100} step={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialog({ open: false, value: 0 })}>Отмена</Button>
            <Button onClick={updateProgress}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
