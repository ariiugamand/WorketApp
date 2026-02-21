import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Phone, Mail, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  info_json: any;
  departments?: { name: string } | null;
}

export default function Employees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filtered, setFiltered] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
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
    if (!search.trim()) { setFiltered(employees); return; }
    const q = search.toLowerCase();
    setFiltered(employees.filter(e =>
      e.full_name.toLowerCase().includes(q) ||
      (e.position || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q) ||
      (e.phone || "").includes(q)
    ));
  }, [search, employees]);

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const getAvatarColor = (name: string) => {
    const colors = ["bg-accent", "bg-success", "bg-warning", "bg-info", "bg-primary"];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <AppLayout title="Сотрудники отдела">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени, должности..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">{filtered.length} сотрудников</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(emp => (
              <div
                key={emp.id}
                className="bg-card border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow hover:border-primary/30"
                onClick={() => setSelected(emp)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(emp.full_name)} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                    {getInitials(emp.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{emp.position || "—"}</p>
                    {emp.departments && (
                      <p className="text-xs text-primary truncate">{emp.departments.name}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
                <div className="mt-3 space-y-1">
                  {emp.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" /><span>{emp.phone}</span>
                    </div>
                  )}
                  {emp.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" /><span className="truncate">{emp.email}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Сотрудники не найдены
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee detail modal */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Карточка сотрудника</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full ${getAvatarColor(selected.full_name)} text-white flex items-center justify-center text-2xl font-bold`}>
                  {getInitials(selected.full_name)}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selected.full_name}</h3>
                  <p className="text-muted-foreground">{selected.position || "Должность не указана"}</p>
                  {selected.departments && <p className="text-sm text-primary">{selected.departments.name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Телефон</p>
                  <p className="font-medium">{selected.phone || "—"}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Email</p>
                  <p className="font-medium truncate">{selected.email || "—"}</p>
                </div>
              </div>
              {selected.info_json && Object.keys(selected.info_json).length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-2">Дополнительно</p>
                  {Object.entries(selected.info_json).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{k}:</span>
                      <span className="font-medium">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
