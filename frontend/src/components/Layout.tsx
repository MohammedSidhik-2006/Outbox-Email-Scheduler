import { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Mail, Search, MessageSquare } from 'lucide-react';

export function Layout({ children, onSearch }: { children: ReactNode, onSearch?: (q: string) => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg tracking-tight">ReachInbox</span>
        </div>
        
        <div className="flex-1 max-w-xl mx-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search emails..." 
            className="w-full bg-background border border-border rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-6">
          <button className="text-muted-foreground hover:text-foreground transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          
          <div className="flex items-center gap-3 border-l border-border pl-6">
            <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`} alt="Avatar" className="w-8 h-8 rounded-full border border-border object-cover" />
            <div className="text-sm">
              <p className="font-medium">{user?.name}</p>
              <p className="text-muted-foreground text-xs">{user?.email}</p>
            </div>
            <button onClick={logout} className="ml-2 text-muted-foreground hover:text-danger p-2 rounded-lg hover:bg-background transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex gap-6">
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            <div className="px-3 py-2 text-sm font-medium text-foreground bg-card rounded-lg border border-border shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                Slack Integration
              </div>
              {user?.slackConnected ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
              ) : (
                <span className="flex h-2 w-2 relative">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
                </span>
              )}
            </div>
            
            <div className="mt-2 p-3 bg-card border border-border rounded-lg text-sm text-center">
              {user?.slackConnected ? (
                <>
                  <p className="text-muted-foreground mb-3">Slack is connected for rate limit alerts.</p>
                  <button onClick={() => {
                    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/integrations/slack/disconnect`, { method: 'POST', credentials: 'include' })
                      .then(() => window.location.reload());
                  }} className="text-danger hover:text-danger/80 font-medium">Disconnect</button>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-3">Connect Slack to receive alerts.</p>
                  <button onClick={() => {
                    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/integrations/slack/connect`;
                  }} className="text-primary hover:text-primary/80 font-medium">Connect Slack</button>
                </>
              )}
            </div>
          </nav>
        </aside>
        
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
