import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EVENT_TYPES, formatDate, getCurrentMonthStr } from "@/lib/utils-crm";
import { Plus, Edit2, Send, Users, CalendarDays } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  event_type: string;
  title: string;
  date: string;
  time: string | null;
  importance: string;
  description: string | null;
  created_by: string | null;
}

interface Employee { id: string; full_name: string; }

const emptyForm = { title: "", event_type: EVENT_TYPES[0], date: "", time: "", importance: "medium", description: "" };

const importanceBadge: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-600 text-white",
};
const importanceLabel: Record<string, string> = {
  low: "Низкая", medium: "Средняя", high: "Высокая", critical: "Критическая",
};
const importanceDot: Record<string, string> = {
  low: "bg-gray-400", medium: "bg-yellow-500", high: "bg-red-500", critical: "bg-red-600",
};

export default function Events() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthStr] = useState(getCurrentMonthStr());
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [notifyDialog, setNotifyDialog] = useState<{ open: boolean; eventId?: string; mode: "all" | "selected" }>({ open: false, mode: "all" });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setCurrentUserId(u.id); });
    supabase.from("employees").select("id,full_name").then(({ data }) => setEmployees(data || []));
  }, []);

  useEffect(() => { loadEvents(); }, [monthStr]);

  const loadEvents = async () => {
    setLoading(true);
    const [y, m] = monthStr.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const { data } = await supabase
      .from("events")
      .select("*")
      .gte("date", `${monthStr}-01`)
      .lte("date", `${monthStr}-${lastDay}`)
      .order("date").order("time");
    setEvents(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditEvent(null);
    setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] });
    setFormOpen(true);
  };

  const openEdit = (ev: Event) => {
    setEditEvent(ev);
    setForm({ title: ev.title, event_type: ev.event_type, date: ev.date, time: ev.time || "", importance: ev.importance, description: ev.description || "" });
    setFormOpen(true);
  };

  const saveEvent = async () => {
    if (!form.title.trim() || !form.date) { toast({ title: "Заполните обязательные поля", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { ...form, time: form.time || null, description: form.description || null, created_by: currentUserId };
    let error;
    if (editEvent) {
      ({ error } = await supabase.from("events").update(payload).eq("id", editEvent.id));
    } else {
      ({ error } = await supabase.from("events").insert(payload));
    }
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: editEvent ? "Событие обновлено" : "Событие создано" }); setFormOpen(false); loadEvents(); }
    setSaving(false);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Отменить событие?")) return;
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "Событие отменено" });
    loadEvents();
  };

  const sendNotifications = async () => {
    const { eventId, mode } = notifyDialog;
    if (!eventId) return;
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    const text = `📅 Событие: ${ev.title} — ${formatDate(ev.date)}${ev.time ? ` в ${ev.time.slice(0, 5)}` : ""}`;
    const targets = mode === "all" ? employees : employees.filter(e => selectedEmployees.includes(e.id));
    const inserts = targets.map(emp => ({ event_id: eventId, employee_id: emp.id, text }));
    const { error } = await supabase.from("notifications").insert(inserts);
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Уведомления отправлены ${targets.length} сотрудникам` });
      setNotifyDialog({ open: false, mode: "all" });
      setSelectedEmployees([]);
    }
  };

  return (
    <AppLayout title="Мероприятия">
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-center">Мероприятия</h1>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-white/80 border rounded-xl">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет мероприятий в этом месяце</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.id} className="bg-white/90 border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{ev.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {formatDate(ev.date)}{ev.time ? `, ${ev.time.slice(0, 5)}` : ""}
                    </p>
                    {ev.description && (
                      <p className="text-sm text-foreground/80 mt-1">{ev.description}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={cn("w-2 h-2 rounded-full flex-shrink-0", importanceDot[ev.importance])} />
                      <span className="text-xs text-muted-foreground">
                        Важность: <strong>{importanceLabel[ev.importance]}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => deleteEvent(ev.id)}>
                      Отменить
                    </Button>
                    <Button size="sm" className="text-xs h-7 gap-1" onClick={() => openEdit(ev)}>
                      <Edit2 className="w-3 h-3" />
                      Редактировать
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline" size="sm" className="gap-1.5 text-xs"
                    onClick={() => setNotifyDialog({ open: true, eventId: ev.id, mode: "all" })}
                  >
                    <Send className="w-3 h-3" /> Отправить всем
                  </Button>
                  <Button
                    variant="outline" size="sm" className="gap-1.5 text-xs"
                    onClick={() => { setSelectedEmployees([]); setNotifyDialog({ open: true, eventId: ev.id, mode: "selected" }); }}
                  >
                    <Users className="w-3 h-3" /> Выбрать
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <Button onClick={openCreate} className="gap-2 px-8">
            <Plus className="w-4 h-4" />
            Создать событие
          </Button>
        </div>
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">
              {editEvent ? "Редактирование мероприятия" : "Создание мероприятия"}
            </DialogTitle>
            {!editEvent && (
              <p className="text-sm text-muted-foreground text-center -mt-1">Заполните информацию ниже</p>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название мероприятия</Label>
              <Input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Название события"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Дата и время:</Label>
              <div className="flex gap-2 mt-1">
                <div className="relative flex-1">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="pl-9"
                  />
                </div>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(p => ({ ...p, time: e.target.value }))}
                  className="w-32"
                />
              </div>
            </div>
            <div>
              <Label>Описание:</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Добавьте описание...."
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Важность</Label>
                <Select value={form.importance} onValueChange={v => setForm(p => ({ ...p, importance: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите важность:" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                    <SelectItem value="critical">Критическая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Тип события</Label>
                <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Выберите тип события" /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            <Button onClick={saveEvent} disabled={saving} className="px-8">
              {saving ? "Сохранение..." : editEvent ? "Сохранить" : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notify dialog */}
      <Dialog open={notifyDialog.open} onOpenChange={open => setNotifyDialog(p => ({ ...p, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {notifyDialog.mode === "all" ? "Отправить уведомления всем" : "Выбрать получателей"}
            </DialogTitle>
          </DialogHeader>
          {notifyDialog.mode === "selected" && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={e => setSelectedEmployees(prev =>
                      e.target.checked ? [...prev, emp.id] : prev.filter(id => id !== emp.id)
                    )}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm">{emp.full_name}</span>
                </label>
              ))}
            </div>
          )}
          {notifyDialog.mode === "all" && (
            <p className="text-sm text-muted-foreground">
              Уведомление будет отправлено всем {employees.length} сотрудникам.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialog({ open: false, mode: "all" })}>Отмена</Button>
            <Button
              onClick={sendNotifications}
              disabled={notifyDialog.mode === "selected" && selectedEmployees.length === 0}
            >
              <Send className="w-4 h-4 mr-1" />Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
