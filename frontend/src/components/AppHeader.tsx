import { Bell, Search, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
}

export default function AppHeader({ title, subtitle, onToggleSidebar }: AppHeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          {title && <h1 className="font-heading text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>}
          {subtitle && <p className="text-xs text-muted-foreground truncate hidden sm:block">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9 w-48 lg:w-64 h-9 text-sm bg-muted/50 border-transparent focus:border-primary"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </Button>
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
    </header>
  );
}
