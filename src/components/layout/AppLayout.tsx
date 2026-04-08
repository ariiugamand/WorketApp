import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NotificationCenter } from "@/components/common/NotificationCenter";
import { getCurrentUser, AuthUser } from "@/lib/auth";
import { Menu, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    getCurrentUser().then(u => {
      if (!u) navigate("/login");
      else { setUser(u); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getInitials = (name?: string) => {
    if (!name) return "ЛК";
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center page-gradient">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-30 lg:z-auto transition-transform duration-300
        ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <AppSidebar userName={user?.full_name || user?.login} userRole={user?.role} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b shadow-sm flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo / app name */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:block text-sm font-semibold text-foreground">Кадровая система</span>
          </div>

          <h1 className="text-base font-semibold text-foreground flex-1 truncate text-muted-foreground">{title}</h1>

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="text-foreground">
              {user && <NotificationCenter userId={user.id} />}
            </div>

            {/* User avatar */}
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 cursor-pointer hover:bg-primary/90 transition-colors">
              {getInitials(user?.full_name || user?.login)}
            </div>
          </div>
        </header>

        {/* Page content with gradient */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto animate-fade-in page-gradient">
          {children}
        </main>
      </div>
    </div>
  );
}
