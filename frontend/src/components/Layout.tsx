import { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Mail, Search, MessageSquare, ChevronDown } from 'lucide-react';

export function Layout({ children, onSearch }: { children: ReactNode, onSearch?: (q: string) => void }) {
  const { user, logout } = useAuth();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 sticky top-0 z-20 shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg p-1">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center shadow-md">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight text-gray-900">ReachInbox</span>
        </div>
        
        {/* Search bar */}
        <div className="flex-1 max-w-md mx-8 relative">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${isSearchFocused ? 'text-blue-500' : 'text-gray-400'}`} />
          <input 
            type="text" 
            placeholder="Search emails, subjects..." 
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 cursor-text hover:border-gray-300"
            onChange={(e) => onSearch?.(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button 
            disabled
            className="relative p-2 text-gray-400 cursor-not-allowed rounded-lg" 
            title="Notifications (coming soon)"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="h-8 w-px bg-gray-200"></div>
          
          {/* Profile dropdown */}
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              title="User menu"
              aria-label="Open user menu"
              aria-expanded={isProfileOpen}
            >
              <img 
                src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3b82f6&color=fff&bold=true`} 
                alt="Avatar" 
                className="w-7 h-7 rounded-full border border-gray-200 object-cover bg-gray-100" 
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=3b82f6&color=fff&bold=true`;
                }}
              />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{user?.email || ''}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown menu */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-lg py-1 z-30">
                <button 
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        {/* Sidebar - hidden on mobile, shown on tablet and up */}
        <aside className="hidden lg:block w-72 border-r border-gray-200 p-6 overflow-y-auto bg-white flex-shrink-0">
          <div className="space-y-4">
            {/* Slack integration card */}
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl hover:shadow-md transition-shadow cursor-default">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Slack Integration</h3>
                </div>
                {user?.slackConnected ? (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                ) : (
                  <span className="flex h-2 w-2 relative">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-300"></span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                {user?.slackConnected 
                  ? 'Connected for rate limit alerts and campaign updates.' 
                  : 'Connect Slack to receive alerts about rate limits and campaign status.'}
              </p>
              <button 
                onClick={() => {
                  if (user?.slackConnected) {
                    fetch(`${import.meta.env.VITE_API_BASE_URL}/api/integrations/slack/disconnect`, { method: 'POST', credentials: 'include' })
                      .then(() => window.location.reload());
                  } else {
                    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/integrations/slack/connect`;
                  }
                }}
                className={`text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 rounded px-2 py-1 ${
                  user?.slackConnected 
                    ? 'text-red-600 hover:text-red-700 focus:ring-red-500' 
                    : 'text-blue-600 hover:text-blue-700 focus:ring-blue-500'
                }`}
              >
                {user?.slackConnected ? 'Disconnect' : 'Connect Slack'}
              </button>
            </div>

            {/* Info box */}
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 text-center">
              <p className="font-medium text-gray-700 mb-1">Pro Tip</p>
              <p>Use bulk uploads to schedule hundreds of emails at once</p>
            </div>
          </div>
        </aside>

        {/* Content area */}
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
