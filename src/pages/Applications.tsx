import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { APP_TYPES, formatDate } from "@/lib/utils-crm";
import { CheckCircle, XCircle, Clock, ChevronRight, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser } from "@/lib/auth";

interface Application {
  id: string;
  app_type: string;
  text: string;
  status: string;
  decision_comment: string | null;
  created_at: string;
  decided_at: string | null;
  employee_id: string;
  decided_by: string | null;
  employees?: { full_name: string; position: string | null; } | null;
  profiles?: { full_name: string | null } | null;
}

export default function Applications() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [decideDialog, setDecideDialog] = useState<{ open: boolean; app?: Application; decision?: "approved" | "rejected" }>({ open: false });
  const [comment, setComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    getCurrentUser().then(u => { if (u) setCurrentUserId(u.id); });
    loadApplications();
  }, []);

  const loadApplications = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select("*, employees(full_name,position)")
      .order("created_at", { ascending: false });
    setApplications(data || []);
    setLoading(false);
  };

  const openDecide = (app: Application, decision: "approved" | "rejected") => {
    setDecideDialog({ open: true, app, decision });
    setComment("");
  };

  const submitDecision = async () => {
    const { app, decision } = decideDialog;
    if (!app || !decision) return;
    const { error } = await supabase.from("applications").update({
      status: decision,
      decision_comment: comment || null,
      decided_by: currentUserId,
      decided_at: new Date().toISOString(),
    }).eq("id", app.id);
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else {
      toast({ title: decision === "approved" ? "Заявление одобрено" : "Заявление отклонено" });
      setDecideDialog({ open: false });
      loadApplications();
    }
  };

  const filteredApps = filterStatus === "all" ? applications : applications.filter(a => a.status === filterStatus);

  const statusOptions = [
    { value: "all", label: "Все" },
    { value: "new", label: "Новые" },
    { value: "approved", label: "Одобренные" },
    { value: "rejected", label: "Отклонённые" },
  ];

  const newCount = applications.filter(a => a.status === "new").length;

  return (
    <AppLayout title="Заявления сотрудников">
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 flex-wrap">
            {statusOptions.map(o => (
              <Button key={o.value} variant={filterStatus === o.value ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(o.value)}>
                {o.label}{o.value === "new" && newCount > 0 && <span className="ml-1 bg-destructive text-white rounded-full px-1.5 text-xs">{newCount}</span>}
              </Button>
            ))}
          </div>
          <span className="ml-auto text-sm text-muted-foreground">{filteredApps.length} заявлений</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border rounded-xl">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Заявлений не найдено</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredApps.map(app => (
              <div key={app.id} className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={app.status} />
                      <span className="text-xs bg-primary-muted text-primary px-2 py-0.5 rounded-full">{app.app_type}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
                    </div>
                    <p className="font-semibold">{app.employees?.full_name || "—"}</p>
                    {app.employees?.position && <p className="text-xs text-muted-foreground">{app.employees.position}</p>}
                    <p className="text-sm text-foreground mt-2 line-clamp-2">{app.text}</p>
                    {app.decision_comment && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <span className="font-medium">Решение: </span>{app.decision_comment}
                        {app.decided_at && <span className="text-muted-foreground ml-1">({formatDate(app.decided_at)})</span>}
                      </div>
                    )}
                  </div>
                  {app.status === "new" && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Button size="sm" className="gap-1 bg-success hover:bg-success/90" onClick={() => openDecide(app, "approved")}>
                        <CheckCircle className="w-4 h-4" /> Одобрить
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => openDecide(app, "rejected")}>
                        <XCircle className="w-4 h-4" /> Отклонить
                      </Button>
                    </div>
                  )}
                  {app.status !== "new" && (
                    <div className="flex-shrink-0">
                      {app.status === "approved" ? (
                        <CheckCircle className="w-6 h-6 text-success" />
                      ) : (
                        <XCircle className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision dialog */}
      <Dialog open={decideDialog.open} onOpenChange={open => setDecideDialog(p => ({ ...p, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decideDialog.decision === "approved" ? "Одобрить заявление" : "Отклонить заявление"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {decideDialog.app && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{decideDialog.app.employees?.full_name}</p>
                <p className="text-muted-foreground">{decideDialog.app.app_type}</p>
                <p className="mt-1">{decideDialog.app.text}</p>
              </div>
            )}
            <div>
              <Label>Комментарий к решению (необязательно)</Label>
              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Введите комментарий..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideDialog({ open: false })}>Отмена</Button>
            <Button
              onClick={submitDecision}
              className={decideDialog.decision === "approved" ? "bg-success hover:bg-success/90" : ""}
              variant={decideDialog.decision === "rejected" ? "destructive" : "default"}
            >
              {decideDialog.decision === "approved" ? "Одобрить" : "Отклонить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
