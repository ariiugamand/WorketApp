import { useEffect, useState } from "react";
import { Bell, X, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  text: string;
  is_read: boolean;
  created_at: string;
  events?: { title: string } | null;
}

interface NotificationCenterProps {
  userId: string;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    // Get employee linked to this user
    const { data: emp } = await supabase
      .from("employees")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!emp) {
      // Manager: get all notifications
      const { data } = await supabase
        .from("notifications")
        .select("*, events(title)")
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications((data || []) as Notification[]);
    } else {
      const { data } = await supabase
        .from("notifications")
        .select("*, events(title)")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications((data || []) as Notification[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();
    // Realtime subscription
    const channel = supabase
      .channel("notifications-" + userId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    fetchNotifications();
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative text-sidebar-foreground hover:bg-sidebar-accent"
        onClick={() => setOpen(!open)}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-destructive text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-card border rounded-lg shadow-xl z-50 animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold text-sm">Уведомления</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={markAllRead} title="Отметить все прочитанными">
                  <CheckCheck className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-center text-muted-foreground text-sm p-4">Загрузка...</p>
            ) : notifications.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm p-4">Нет уведомлений</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    "p-3 border-b last:border-b-0 text-sm",
                    !n.is_read && "bg-primary-muted"
                  )}
                >
                  {n.events?.title && (
                    <p className="text-xs text-muted-foreground font-medium mb-0.5">{n.events.title}</p>
                  )}
                  <p className="text-foreground">{n.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(n.created_at).toLocaleString("ru-RU")}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
