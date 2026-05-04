import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  Building2,
  Database,
  Users,
  Newspaper,
  Search,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'NGOs', href: '/ngos', icon: Building2 },
  { label: 'OKOIP Registry', href: '/okoip', icon: Database },
  { label: 'Journalists', href: '/journalists', icon: Users },
  { label: 'Media Outlets', href: '/outlets', icon: Newspaper },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold tracking-tight">
          ✦
        </div>
        <div className="flex flex-col leading-none">
          <span className="font-semibold text-scale-h6 tracking-tight">Constellation</span>
          <span className="text-scale-small text-sidebar-foreground/40 font-normal">Stellar Partners</span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <Link to="/search">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent text-scale-small h-8">
            <Search className="h-3.5 w-3.5" />
            Quick search...
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-0.5 py-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/' && location.pathname.startsWith(item.href));
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start gap-3 text-scale-small font-normal h-8 px-3",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3">
        <p className="text-scale-small text-sidebar-foreground/40 text-center">
          Stellar Partners &middot; Constellation
        </p>
      </div>
    </aside>
  );
}
