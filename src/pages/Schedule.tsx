import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTime, getDaysInMonth, getCurrentMonthStr } from "@/lib/utils-crm";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type ViewMode = "view" | "edit";

export default function Schedule() {
  const { toast } = useToast();
  const [monthStr, setMonthStr] = useState(getCurrentMonthStr());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, ScheduleEntry>>({});
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("view");

  const [changeDialog, setChangeDialog] = useState<{
    open: boolean; entry?: ScheduleEntry; empId?: string; date?: string;
  }>({ open: false });
  const [changeForm, setChangeForm] = useState({ reason: "", transfer_date: "", replacement_employee_id: "" });

  const [timeDialog, setTimeDialog] = useState<{
    open: boolean; empId?: string; date?: string; dateLabel?: string;
  }>({ open: false });
  const [timeForm, setTimeForm] = useState({ start_time: "08:00", end_time: "17:00" });

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

  const getEntry = (empId: string, day: number) => {
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    return scheduleMap[`${empId}_${date}`];
  };

  const checkWeekend = (day: number) => {
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    const dow = new Date(date).getDay();
    return dow === 0 || dow === 6;
  };

  const openChangeDialog = (empId: string, day: number) => {
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    const entry = scheduleMap[`${empId}_${date}`];
    if (!entry || entry.status === "day_off") return;
    setChangeForm({ reason: "", transfer_date: "", replacement_employee_id: "" });
    setChangeDialog({ open: true, entry, empId, date });
  };

  const saveChange = async () => {
    const { entry } = changeDialog;
    if (!entry) return;
    const { error } = await supabase.from("schedule").update({
      status: "cancelled",
      reason: changeForm.reason || null,
      replacement_employee_id: changeForm.replacement_employee_id || null,
      updated_at: new Date().toISOString(),
    }).eq("id", entry.id);
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Изменения сохранены" }); setChangeDialog({ open: false }); loadData(); }
  };

  const openTimeDialog = (empId: string, day: number) => {
    if (checkWeekend(day)) return;
    const date = `${monthStr}-${String(day).padStart(2, "0")}`;
    const entry = scheduleMap[`${empId}_${date}`];
    const dateLabel = new Date(date + "T00:00:00").toLocaleDateString("ru-RU", {
      day: "numeric", month: "long", year: "numeric"
    });
    setTimeForm({
      start_time: entry?.start_time?.slice(0, 5) || "08:00",
      end_time: entry?.end_time?.slice(0, 5) || "17:00",
    });
    setTimeDialog({ open: true, empId, date, dateLabel });
  };

  const saveTime = async () => {
    const { empId, date } = timeDialog;
    if (!empId || !date) return;
    const existing = scheduleMap[`${empId}_${date}`];
    const payload = {
      employee_id: empId,
      date,
      start_time: timeForm.start_time,
      end_time: timeForm.end_time,
      status: "scheduled",
      reason: null,
      replacement_employee_id: null,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (existing) {
      ({ error } = await supabase.from("schedule").update(payload).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("schedule").insert(payload));
    }
    if (error) { toast({ title: "Ошибка", description: error.message, variant: "destructive" }); }
    else { setTimeDialog({ open: false }); loadData(); }
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
    const genDays = getDaysInMonth(y, m - 1);
    const inserts = [];
    for (const emp of employees) {
      for (let d = 1; d <= genDays; d++) {
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
    else { toast({ title: "График сгенерирован!" }); setMonthStr(generateMonth); setViewMode("view"); }
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

  const monthLabel = new Date(monthStr + "-01").toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <AppLayout title={viewMode === "edit" ? "Рабочий график" : "Просмотр графика"}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">
            {viewMode === "edit" ? "Рабочий график" : "Просмотр графика"}
          </h1>
          <p className="text-sm text-muted-foreground">Рабочий график</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-white rounded-lg border px-2 py-1">
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-medium text-sm min-w-40 text-center">Месяц: {monthLabelCap}</span>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => changeMonth(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Select defaultValue="az">
            <SelectTrigger className="w-24 bg-white h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="az">А-Я</SelectItem>
              <SelectItem value="za">Я-А</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            {viewMode === "view" ? (
              <>
                <Input
                  type="month"
                  value={generateMonth}
                  onChange={e => setGenerateMonth(e.target.value)}
                  className="w-40 bg-white h-9"
                  min={nextMonthStr}
                  max={nextMonthStr}
                />
                <Button
                  onClick={generateMonth ? generateSchedule : () => setViewMode("edit")}
                  disabled={generating}
                  className="gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {generating ? "Генерация..." : "Составить график"}
                </Button>
              </>
            ) : (
              <Button onClick={() => { toast({ title: "График сохранён" }); setViewMode("view"); }}>
                Сохранить
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white/80 border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-max">
                <thead>
                  <tr className="bg-green-50/80">
                    <th className="text-left px-4 py-2.5 font-semibold sticky left-0 bg-green-50/80 z-10 min-w-36 border-r">
                      Сотрудник
                    </th>
                    {days.map(d => (
                      <th
                        key={d}
                        className={cn(
                          "px-0.5 py-2 text-center font-medium border-r w-9",
                          checkWeekend(d) && "bg-gray-50 text-muted-foreground"
                        )}
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, ei) => (
                    <tr key={emp.id} className={ei % 2 === 0 ? "bg-white" : "bg-green-50/20"}>
                      <td className={cn(
                        "px-4 py-2 font-medium sticky left-0 z-10 border-r text-sm",
                        ei % 2 === 0 ? "bg-white" : "bg-green-50/20"
                      )}>
                        <p className="truncate max-w-32">{emp.full_name}</p>
                      </td>
                      {days.map(d => {
                        const entry = getEntry(emp.id, d);
                        const pref = hasPreference(emp.id, d);
                        const wknd = checkWeekend(d);
                        const isWorking = entry?.status === "scheduled";
                        const isCancelled = entry?.status === "cancelled";

                        if (viewMode === "edit") {
                          return (
                            <td
                              key={d}
                              className={cn(
                                "border-r text-center h-9",
                                wknd ? "bg-gray-50/50" : "cursor-pointer hover:bg-primary/5"
                              )}
                              onClick={() => !wknd && openTimeDialog(emp.id, d)}
                            >
                              <div className="flex items-center justify-center">
                                {isWorking && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
                                {pref && !isWorking && <span className="w-2 h-2 rounded-full bg-red-300 inline-block" />}
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={d}
                            className={cn(
                              "border-r text-center h-9",
                              wknd && "bg-gray-50/50",
                              pref && "has-preference",
                              isWorking && "cursor-pointer hover:bg-primary/5"
                            )}
                            onClick={() => isWorking ? openChangeDialog(emp.id, d) : undefined}
                            title={
                              isWorking
                                ? `${formatTime(entry!.start_time)} — ${formatTime(entry!.end_time)}`
                                : pref ? `Пожелание: ${pref.preference_text}` : undefined
                            }
                          >
                            <div className="flex items-center justify-center">
                              {isWorking && (
                                <span className={cn(
                                  "w-2 h-2 rounded-full inline-block",
                                  pref ? "bg-yellow-500" : "bg-emerald-500"
                                )} />
                              )}
                              {isCancelled && <X className="w-3 h-3 text-destructive mx-auto" />}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-5 px-4 py-3 border-t bg-green-50/40 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Рабочий день
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                Выходной день (пожелание)
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change dialog */}
      <Dialog open={changeDialog.open} onOpenChange={open => setChangeDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Изменение расписания</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label>Причина:</Label>
              <Input
                value={changeForm.reason}
                onChange={e => setChangeForm(p => ({ ...p, reason: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Перенос на:</Label>
              <Input
                type="date"
                value={changeForm.transfer_date}
                onChange={e => setChangeForm(p => ({ ...p, transfer_date: e.target.value }))}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-0.5">*опционально</p>
            </div>
            <div>
              <Label>Заменяющий:</Label>
              <Select
                value={changeForm.replacement_employee_id}
                onValueChange={v => setChangeForm(p => ({ ...p, replacement_employee_id: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  {employees.filter(e => e.id !== changeDialog.empId).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-0.5">*опционально</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={saveChange}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time dialog */}
      <Dialog open={timeDialog.open} onOpenChange={open => setTimeDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Установите время</DialogTitle>
          </DialogHeader>
          {timeDialog.dateLabel && (
            <p className="text-center text-sm font-medium -mt-2">{timeDialog.dateLabel}</p>
          )}
          <div className="flex items-end gap-3 justify-center py-3">
            <div>
              <Label className="text-xs text-muted-foreground">с</Label>
              <Input
                type="time"
                value={timeForm.start_time}
                onChange={e => setTimeForm(p => ({ ...p, start_time: e.target.value }))}
                className="w-28 text-center text-base font-medium mt-1"
              />
            </div>
            <span className="text-muted-foreground pb-2">до</span>
            <div>
              <Label className="text-xs text-muted-foreground">до</Label>
              <Input
                type="time"
                value={timeForm.end_time}
                onChange={e => setTimeForm(p => ({ ...p, end_time: e.target.value }))}
                className="w-28 text-center text-base font-medium mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={saveTime}>Сохранить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
