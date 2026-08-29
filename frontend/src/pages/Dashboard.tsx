import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Plus } from 'lucide-react';
import { ComposeEmailModal } from '../components/ComposeEmailModal';
import { ScheduledEmailsTable } from '../components/ScheduledEmailsTable';
import { SentEmailsTable } from '../components/SentEmailsTable';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [searchQuery, setSearchQuery] = useState('');
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  return (
    <Layout onSearch={setSearchQuery}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage and track your email outreach</p>
          </div>
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Compose New Email
          </button>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="border-b border-border flex px-4">
            <button 
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'scheduled' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
            >
              Scheduled Emails
            </button>
            <button 
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sent' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
            >
              Sent Emails
            </button>
          </div>
          
          <div className="p-0">
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
