import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, MessageSquareText, Users, Briefcase, Settings, Sparkles } from "lucide-react";

const navigation = [
  { name: "Agent Chat", href: "/", icon: MessageSquareText },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Cases", href: "/cases", icon: Briefcase },
  { name: "Analytics", href: "/analytics", icon: LayoutDashboard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border shadow-sm">
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <Sparkles className="h-6 w-6 text-primary mr-2" />
        <span className="text-xl font-bold font-display text-foreground">Nexus CRM</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border/50">
        <div className="bg-primary/10 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-primary mb-1">Status: Active</h4>
            <p className="text-xs text-muted-foreground">Connected to Salesforce Mock</p>
        </div>
      </div>
    </div>
  );
}
