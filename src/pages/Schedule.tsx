import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { formatTime, getDaysInMonth, getCurrentMonthStr } from "@/lib/utils-crm";
import { ChevronLeft, ChevronRight, Edit2, Plus, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ScheduleEntry {
  id: string;
  employee_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  reason: string | null;
  replacement_employee_id: string | null;
}

interface Preference {
  employee_id: string;
  date: string;
  preference_text: string;
}

interface Employee { id: string; full_name: string; position: string | null; }

export default function Schedule() {
  const { toast } = useToast();
  const [monthStr, setMonthStr] = useState(getCurrentMonthStr());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleEntry>>({});
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{ open: boolean; entry?: ScheduleEntry; empId?: string; date?: string }>({ open: false });
  const [editForm, setEditForm] = useState({ start_time: "", end_time: "", status: "scheduled", reason: "", replacement_employee_id: "" });
  const [generating, setGenerating] = useState(false);
  const [generateMonth, setGenerateMonth] = useState("");

  const [year, month] = monthStr.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, month - 1);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  useEffect(() => { loadData(); }, [monthStr]);

  const loadData = async () => {
    setLoading(true);
    const [empsRes, schedRes, prefRes] = await Promise.all([
      supabase.from("employees").select("id,full_name,position").order("full_name"),
      supabase.from("schedule").select("*").gte("date", `${monthStr}-01`).lte("date", `${monthStr}-${daysInMonth}`),
      supabase.from("schedule_preferences").select("*").gte("date", `${monthStr}-01`).lte("date", `${monthStr}-${daysInMonth}`),
    ]);
    setEmployees(empsRes.data || []);
    const map: Record<string, ScheduleEntry> = {};
    (schedRes.data || []).forEach(s => { map[`${s.employee_id}_${s.date}`] = s; });
    setScheduleMap(map);
    setPreferences(prefRes.data || []);
    setLoading(false);
  };

  const hasPreference = (empId: string, day: number) => {
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    return preferences.find(p => p.employee_id === empId && p.date === date);
  };

  const openEdit = (empId: string, day: number) => {
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    const entry = scheduleMap[`${empId}_${date}`];
    setEditForm({
      start_time: entry?.start_time?.slice(0, 5) || "09:00",
      end_time: entry?.end_time?.slice(0, 5) || "18:00",
      status: entry?.status || "scheduled",
      reason: entry?.reason || "",
      replacement_employee_id: entry?.replacement_employee_id || "",
    });
    setEditDialog({ open: true, entry, empId, date });
  };

  const saveEdit = async () => {
    const { empId, date, entry } = editDialog;
    if (!empId || !date) return;
    const payload = {
      employee_id: empId,
      date,
      start_time: editForm.status === "day_off" ? null : editForm.start_time || null,
      end_time: editForm.status === "day_off" ? null : editForm.end_time || null,
      status: editForm.status,
      reason: editForm.reason || null,
      replacement_employee_id: editForm.replacement_employee_id || null,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (entry) {
      ({ error } = await supabase.from("schedule").update(payload).eq("id", entry.id));
    } else {
      ({ error } = await supabase.from("schedule").insert(payload));
    }
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Сохранено" }); setEditDialog({ open: false }); loadData(); }
  };

  const generateSchedule = async () => {
    if (!generateMonth) { toast({ title: "Выберите месяц для генерации", variant: "destructive" }); return; }
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const genDate = new Date(generateMonth + "-01");
    const maxDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    if (genDate < nextMonth || genDate > maxDate) {
      toast({ title: "Можно составлять только на следующий месяц", variant: "destructive" }); return;
    }
    setGenerating(true);
    const [y, m] = generateMonth.split("-").map(Number);
    const days = getDaysInMonth(y, m - 1);
    const inserts = [];
    for (const emp of employees) {
      for (let d = 1; d <= days; d++) {
        const date = `${generateMonth}-${String(d).padStart(2, "0")}`;
        const dow = new Date(date).getDay();
        inserts.push({
          employee_id: emp.id, date,
          start_time: (dow === 0 || dow === 6) ? null : "09:00",
          end_time: (dow === 0 || dow === 6) ? null : "18:00",
          status: (dow === 0 || dow === 6) ? "day_off" : "scheduled",
        });
      }
    }
    const { error } = await supabase.from("schedule").upsert(inserts, { onConflict: "employee_id,date" });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: "График сгенерирован!" }); setMonthStr(generateMonth); }
    setGenerating(false);
  };

  const changeMonth = (dir: number) => {
    const [y, m] = monthStr.split("-").map(Number);
    const nd = new Date(y, m - 1 + dir, 1);
    setMonthStr(`${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, "0")}`);
  };

  const nextMonthStr = (() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  })();

  const getCellContent = (empId: string, day: number) => {
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    const entry = scheduleMap[`${empId}_${date}`];
    const pref = hasPreference(empId, day);
    const dow = new Date(date).getDay();
    const isWeekend = dow === 0 || dow === 6;
    return { entry, pref, isWeekend };
  };

  return (
    <AppLayout title="График работы">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <span className="font-semibold text-sm min-w-32 text-center">
              {new Date(monthStr + "-01").toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Input type="month" value={generateMonth} onChange={e => setGenerateMonth(e.target.value)} className="w-40" min={nextMonthStr} max={nextMonthStr} />
            <Button onClick={generateSchedule} disabled={generating} className="gap-2">
              <Plus className="w-4 h-4" />
              {generating ? "Генерация..." : "Составить график"}
            </Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 border border-red-400 rounded inline-block" /> Пожелания сотрудника</div>
          <div className="flex items-center gap-1"><StatusBadge status="scheduled" className="text-[10px] py-0" /> Плановый</div>
          <div className="flex items-center gap-1"><StatusBadge status="day_off" className="text-[10px] py-0" /> Выходной</div>
          <div className="flex items-center gap-1"><StatusBadge status="cancelled" className="text-[10px] py-0" /> Отменён</div>
        </div>

        {/* Schedule table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-muted/70">
                    <th className="text-left px-3 py-2 font-semibold sticky left-0 bg-muted/70 z-10 min-w-36 border-r">Сотрудник</th>
                    {days.map(d => {
                      const date = `${monthStr}-${String(d).padStart(2, "0")}`;
                      const dow = new Date(date).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      return (
                        <th key={d} className={cn("px-1 py-2 text-center font-medium border-r w-12", isWeekend && "text-destructive bg-destructive/5")}>
                          <div>{d}</div>
                          <div className="text-muted-foreground">{["вс","пн","вт","ср","чт","пт","сб"][dow]}</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, ei) => (
                    <tr key={emp.id} className={ei % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                      <td className={cn("px-3 py-2 font-medium sticky left-0 z-10 border-r", ei % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                        <p className="truncate max-w-32">{emp.full_name}</p>
                        {emp.position && <p className="text-muted-foreground text-[10px] truncate">{emp.position}</p>}
                      </td>
                      {days.map(d => {
                        const { entry, pref, isWeekend } = getCellContent(emp.id, d);
                        return (
                          <td
                            key={d}
                            className={cn(
                              "border-r text-center cursor-pointer hover:bg-primary/10 transition-colors relative group",
                              isWeekend && "bg-muted/30",
                              pref && "has-preference"
                            )}
                            onClick={() => openEdit(emp.id, d)}
                            title={pref ? `Пожелание: ${pref.preference_text}` : ""}
                          >
                            {pref && <span className="preference-dot absolute top-1 left-1" />}
                            {entry ? (
                              <div className="py-1 px-0.5">
                                {entry.status === "day_off" ? (
                                  <span className="text-muted-foreground text-[10px]">вых</span>
                                ) : entry.status === "cancelled" ? (
                                  <X className="w-3 h-3 text-destructive mx-auto" />
                                ) : entry.status === "scheduled" ? (
                                  <div>
                                    <div className="text-primary font-medium">{formatTime(entry.start_time)}</div>
                                    <div className="text-muted-foreground">{formatTime(entry.end_time)}</div>
                                  </div>
                                ) : (
                                  <StatusBadge status={entry.status} className="text-[9px] py-0 px-1" />
                                )}
                              </div>
                            ) : (
                              <div className="py-1 text-muted-foreground/40 group-hover:text-primary text-lg leading-none">+</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialog.open} onOpenChange={open => setEditDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Редактирование смены — {editDialog.date && new Date(editDialog.date).toLocaleDateString("ru-RU")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editDialog.empId && (() => {
              const emp = employees.find(e => e.id === editDialog.empId);
              const pref = preferences.find(p => p.employee_id === editDialog.empId && p.date === editDialog.date);
              return (
                <>
                  <p className="text-sm font-medium">{emp?.full_name}</p>
                  {pref && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                      <span className="text-red-600 font-medium">Пожелание сотрудника: </span>
                      {pref.preference_text}
                    </div>
                  )}
                </>
              );
            })()}
            <div>
              <Label>Статус смены</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Плановый</SelectItem>
                  <SelectItem value="day_off">Выходной</SelectItem>
                  <SelectItem value="cancelled">Отменить</SelectItem>
                  <SelectItem value="transferred">Перенести</SelectItem>
                  <SelectItem value="reduced">Сократить</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.status !== "day_off" && editForm.status !== "cancelled" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Начало</Label>
                  <Input type="time" value={editForm.start_time} onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>Конец</Label>
                  <Input type="time" value={editForm.end_time} onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>
            )}
            {(editForm.status === "cancelled" || editForm.status === "transferred") && (
              <div>
                <Label>Заменяющий сотрудник</Label>
                <Select value={editForm.replacement_employee_id} onValueChange={v => setEditForm(p => ({ ...p, replacement_employee_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Не назначен" /></SelectTrigger>
                  <SelectContent>
                    {employees.filter(e => e.id !== editDialog.empId).map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Причина / комментарий</Label>
              <Textarea value={editForm.reason} onChange={e => setEditForm(p => ({ ...p, reason: e.target.value }))} placeholder="Опционально" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>Отмена</Button>
            <Button onClick={saveEdit}><Check className="w-4 h-4 mr-1" />Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
