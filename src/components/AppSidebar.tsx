import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Users, Calendar, CalendarDays, ClipboardList, FileText, LogOut, ChevronLeft, ChevronRight, Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { signOut } from "@/lib/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Главная", url: "/dashboard", icon: LayoutDashboard },
  { title: "Сотрудники", url: "/employees", icon: Users },
  { title: "График", url: "/schedule", icon: Calendar },
  { title: "События", url: "/events", icon: CalendarDays },
  { title: "Задачи", url: "/tasks", icon: ClipboardList },
  { title: "Заявления", url: "/applications", icon: FileText },
];

interface AppSidebarProps {
  userName?: string;
  userRole?: string;
}

export function AppSidebar({ userName, userRole }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className={cn(
      "flex flex-col bg-sidebar min-h-screen transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-16" : "w-60"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sidebar-accent-foreground font-semibold text-sm leading-none">WorketApp</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            title={collapsed ? item.title : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-2">
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sidebar-accent-foreground text-sm font-medium truncate">{userName || "Пользователь"}</p>
            <p className="text-sidebar-muted text-xs">{userRole === "manager" ? "Руководитель" : "Сотрудник"}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className={cn(
            "w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive",
            collapsed ? "justify-center px-2" : "justify-start gap-3 px-3"
          )}
          onClick={handleLogout}
          title={collapsed ? "Выйти" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Выйти</span>}
        </Button>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground mt-1",
            collapsed ? "justify-center px-2" : "justify-end px-3"
          )}
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Развернуть" : "Свернуть"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>
    </aside>
  );
}
