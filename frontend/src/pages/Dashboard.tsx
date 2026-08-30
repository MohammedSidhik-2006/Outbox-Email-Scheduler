import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Plus, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/SentEmailsTable';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [stats, setStats] = useState({ scheduled: 0, sent: 0 });

  useEffect(() => {
    // Fetch stats for dashboard
    const fetchStats = async () => {
      try {
        const [scheduledRes, sentRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emails/scheduled?page=1`, { credentials: 'include' }),
          fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emails/sent?page=1`, { credentials: 'include' })
        ]);
        
        if (scheduledRes.ok && sentRes.ok) {
          const scheduledData = await scheduledRes.json();
          const sentData = await sentRes.json();
          setStats({
            scheduled: scheduledData.meta?.total || 0,
            sent: sentData.meta?.total || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <Layout onSearch={setSearchQuery}>
      <div className="space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Email Campaigns</h1>
            <p className="text-gray-600 text-xs sm:text-sm mt-1 sm:mt-2">Schedule, send, and track your outreach campaigns with precision</p>
          </div>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 cursor-pointer whitespace-nowrap"
            title="Create a new email campaign"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Stats grid - responsive columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium mb-1">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{stats.scheduled}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium mb-1">Sent</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-default">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.sent > 0 ? '100%' : '—'}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs and content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* Tab navigation */}
          <div className="border-b border-gray-200 flex flex-wrap sm:flex-nowrap">
            <button 
              onClick={() => setActiveTab('scheduled')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                activeTab === 'scheduled' 
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title="View scheduled emails"
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Scheduled Emails</span>
                <span className="sm:hidden">Scheduled</span>
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('sent')}
              className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-inset ${
                activeTab === 'sent' 
                  ? 'border-green-500 text-green-600 bg-green-50/50' 
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title="View sent emails"
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sent Emails</span>
                <span className="sm:hidden">Sent</span>
              </div>
            </button>
          </div>
          
          {/* Table content */}
          <div className="p-0 flex-1">
            {activeTab === 'scheduled' ? (
              <ScheduledEmailsTable searchQuery={searchQuery} />
            ) : (
              <SentEmailsTable searchQuery={searchQuery} />
            )}
          </div>
        </div>
      </div>
      
      {isComposeOpen && <ComposeEmailModal onClose={() => setIsComposeOpen(false)} />}
    </Layout>
  );
}
