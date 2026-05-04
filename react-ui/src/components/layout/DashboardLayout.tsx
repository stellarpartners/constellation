import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-60 flex-1">
        <div className="flex h-14 items-center border-b bg-background px-6">
          {title && (
            <h1 className="text-scale-h6 font-semibold text-foreground">{title}</h1>
          )}
        </div>
        <ScrollArea className="h-[calc(100vh-3.5rem)]">
          <div className="p-6">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
