import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { IMPORTANCE_COLORS, EVENT_TYPES, formatDate, getCurrentMonthStr } from "@/lib/utils-crm";
import { Plus, Edit2, Trash2, Send, Users, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function Events() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [monthStr, setMonthStr] = useState(getCurrentMonthStr());
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

  const openCreate = () => { setEditEvent(null); setForm({ ...emptyForm, date: new Date().toISOString().split("T")[0] }); setFormOpen(true); };
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
    if (!confirm("Удалить событие?")) return;
    await supabase.from("events").delete().eq("id", id);
    toast({ title: "Событие удалено" });
    loadEvents();
  };

  const sendNotifications = async () => {
    const { eventId, mode } = notifyDialog;
    if (!eventId) return;
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;
    const text = `📅 Событие: ${ev.title} — ${formatDate(ev.date)}${ev.time ? ` в ${ev.time.slice(0,5)}` : ""}`;
    const targets = mode === "all" ? employees : employees.filter(e => selectedEmployees.includes(e.id));
    const inserts = targets.map(emp => ({ event_id: eventId, employee_id: emp.id, text }));
    const { error } = await supabase.from("notifications").insert(inserts);
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: `Уведомления отправлены ${targets.length} сотрудникам` }); setNotifyDialog({ open: false, mode: "all" }); setSelectedEmployees([]); }
  };

  const changeMonth = (dir: number) => {
    const [y, m] = monthStr.split("-").map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    setMonthStr(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`);
  };

  const importanceBadge: Record<string, string> = { low: "bg-muted text-muted-foreground", medium: "bg-warning/20 text-warning", high: "bg-destructive/20 text-destructive", critical: "bg-destructive text-destructive-foreground" };
  const importanceLabel: Record<string, string> = { low: "Низкая", medium: "Средняя", high: "Высокая", critical: "Критическая" };

  return (
    <AppLayout title="Календарь событий">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-semibold text-sm min-w-32 text-center">
              {new Date(monthStr + "-01").toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <Button className="ml-auto gap-2" onClick={openCreate}><Plus className="w-4 h-4" />Создать событие</Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Нет событий в этом месяце</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.id} className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold truncate">{ev.title}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", importanceBadge[ev.importance])}>
                        {importanceLabel[ev.importance]}
                      </span>
                      <span className="text-xs bg-primary-muted text-primary px-2 py-0.5 rounded-full">{ev.event_type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(ev.date)}{ev.time ? ` в ${ev.time.slice(0, 5)}` : ""}
                    </p>
                    {ev.description && <p className="text-sm text-foreground mt-2">{ev.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setNotifyDialog({ open: true, eventId: ev.id, mode: "all" })}>
                      <Send className="w-3 h-3" /> Всем
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => { setSelectedEmployees([]); setNotifyDialog({ open: true, eventId: ev.id, mode: "selected" }); }}>
                      <Users className="w-3 h-3" /> Выбрать
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(ev)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => deleteEvent(ev.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editEvent ? "Редактировать событие" : "Новое событие"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название *</Label>
              <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Название события" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Тип события</Label>
                <Select value={form.event_type} onValueChange={v => setForm(p => ({ ...p, event_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Важность</Label>
                <Select value={form.importance} onValueChange={v => setForm(p => ({ ...p, importance: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Низкая</SelectItem>
                    <SelectItem value="medium">Средняя</SelectItem>
                    <SelectItem value="high">Высокая</SelectItem>
                    <SelectItem value="critical">Критическая</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Дата *</Label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label>Время</Label>
                <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Описание события..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Отмена</Button>
            <Button onClick={saveEvent} disabled={saving}>{saving ? "Сохранение..." : "Сохранить"}</Button>
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
                    onChange={e => setSelectedEmployees(prev => e.target.checked ? [...prev, emp.id] : prev.filter(id => id !== emp.id))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{emp.full_name}</span>
                </label>
              ))}
            </div>
          )}
          {notifyDialog.mode === "all" && (
            <p className="text-sm text-muted-foreground">Уведомление будет отправлено всем {employees.length} сотрудникам.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialog({ open: false, mode: "all" })}>Отмена</Button>
            <Button onClick={sendNotifications} disabled={notifyDialog.mode === "selected" && selectedEmployees.length === 0}>
              <Send className="w-4 h-4 mr-1" />Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
}
