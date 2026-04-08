import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Phone, Mail, MoreHorizontal, UserPlus, Calendar, Briefcase } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  info_json: Record<string, unknown> | null;
  birth_date?: string | null;
  hire_date?: string | null;
  departments?: { name: string } | null;
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Employee | null>(null);

  useEffect(() => {
    supabase
      .from("employees")
      .select("*, departments(name)")
      .order("full_name")
      .then(({ data }) => {
        setEmployees(data || []);
        setFiltered(data || []);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let list = [...employees];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.full_name.toLowerCase().includes(q) ||
        (e.position || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (e.phone || "").includes(q)
      );
    }
    list.sort((a, b) =>
      sortOrder === "asc"
        ? a.full_name.localeCompare(b.full_name, "ru")
        : b.full_name.localeCompare(a.full_name, "ru")
    );
    setFiltered(list);
  }, [search, employees, sortOrder]);

  const getTenure = (emp: Employee) => {
    if (!emp.hire_date) return null;
    const hire = new Date(emp.hire_date);
    const now = new Date();
    const years = now.getFullYear() - hire.getFullYear();
    if (years === 0) return "Менее года";
    return `${years} ${years === 1 ? "год" : years < 5 ? "года" : "лет"}`;
  };

  const formatBirthDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  };

  // Split employees into two columns
  const half = Math.ceil(filtered.length / 2);
  const leftCol = filtered.slice(0, half);
  const rightCol = filtered.slice(half);

  return (
    <AppLayout title="Мой отдел">
      <div className="space-y-5">
        {/* Page heading */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Мой отдел</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Список сотрудников подразделения</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 bg-white"
            onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "А-Я ↑" : "Я-А ↓"}
          </Button>
          <Button size="sm" className="gap-1.5 ml-auto">
            <UserPlus className="w-4 h-4" />
            Добавить сотрудника
          </Button>
        </div>

        {/* Employee list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-white rounded-xl border">
            Сотрудники не найдены
          </div>
        ) : (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x">
              <div className="divide-y">
                {leftCol.map((emp, i) => (
                  <EmployeeRow key={emp.id} emp={emp} index={i + 1} onClick={() => setSelected(emp)} />
                ))}
              </div>
              <div className="divide-y">
                {rightCol.map((emp, i) => (
                  <EmployeeRow key={emp.id} emp={emp} index={half + i + 1} onClick={() => setSelected(emp)} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Employee detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {selected && (
            <div>
              <div className="bg-gradient-to-br from-primary/10 to-emerald-50 px-6 pt-6 pb-4 text-center border-b">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                  {selected.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <h3 className="text-lg font-bold text-foreground">{selected.full_name}</h3>
                {selected.birth_date && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatBirthDate(selected.birth_date)}
                  </p>
                )}
              </div>

              <div className="px-6 py-4 space-y-3">
                <DetailRow
                  label="Должность:"
                  value={selected.position || "—"}
                  icon={<Briefcase className="w-4 h-4 text-muted-foreground" />}
                />
                <DetailRow label="Срок работы:" value={getTenure(selected) || "—"} />
                {selected.phone && (
                  <DetailRow
                    label="Телефон:"
                    value={selected.phone}
                    icon={<Phone className="w-4 h-4 text-muted-foreground" />}
                  />
                )}
                {selected.email && (
                  <DetailRow
                    label="Email:"
                    value={selected.email}
                    icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                  />
                )}
                {selected.departments && (
                  <DetailRow label="Отдел:" value={selected.departments.name} />
                )}
                {selected.info_json && Object.keys(selected.info_json).length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">И другая информация...</p>
                    <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                      {Object.entries(selected.info_json).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{k}:</span>
                          <span className="font-medium">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6">
                <Button className="w-full">Редактировать</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

function EmployeeRow({
  emp,
  index,
  onClick,
}: {
  emp: Employee;
  index: number;
  onClick: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 hover:bg-green-50/60 transition-colors group cursor-pointer"
      onClick={onClick}
    >
      <span className="text-sm text-muted-foreground w-6 flex-shrink-0 font-mono">
        {String(index).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{emp.full_name}</p>
        {emp.position && (
          <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={e => {
              e.stopPropagation();
              onClick();
            }}
          >
            Просмотр
          </DropdownMenuItem>
          <DropdownMenuItem onClick={e => e.stopPropagation()}>
            Редактировать
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="text-sm text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground ml-auto text-right truncate max-w-[55%]">
        {value}
      </span>
    </div>
  );
}
