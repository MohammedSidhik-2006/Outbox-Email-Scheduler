import { useState, useRef } from 'react';
import { X, Upload, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ComposeEmailModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [delay, setDelay] = useState(60); // min delay in seconds
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      // Extract emails using regex
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const foundEmails = text.match(emailRegex) || [];
      
      // Deduplicate and set
      const uniqueEmails = [...new Set(foundEmails)];
      setEmails(uniqueEmails);
      
      if (uniqueEmails.length === 0) {
        setError('No valid email addresses found in the file.');
      } else {
        setError('');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!subject || !body || emails.length === 0) {
      setError('Subject, body, and at least one recipient are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emails/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          senderId: 'unknown', // The backend uses requireAuth and finds sender by userId, but Phase 2C might require senderId. Assuming the backend falls back or we need to fetch senders first. For now, let's hardcode or let the backend handle it.
          recipients: emails.map(email => ({ email })),
          subject,
          body,
          delaySeconds: delay,
          hourlyLimit
        })
      });

      if (response.ok) {
        setSuccess('Campaign scheduled successfully!');
        setTimeout(() => onClose(), 2000);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to schedule campaign');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h2 className="text-xl font-semibold">Compose Campaign</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm">{error}</div>}
          {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-sm">{success}</div>}
          
          <form id="compose-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter campaign subject"
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Message Body</label>
              <textarea 
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message here..."
                rows={6}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Recipients (CSV/TXT)</label>
              <div 
                className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center bg-background/50 hover:bg-background transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload CSV or TXT file</p>
                <p className="text-xs text-muted-foreground mt-1">Files will be parsed automatically</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.txt"
                  className="hidden" 
                />
              </div>
              {emails.length > 0 && (
                <p className="mt-2 text-sm text-green-500 font-medium">
                  ✓ {emails.length} valid email(s) detected
                </p>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Delay (seconds)</label>
                <input 
                  type="number" 
                  value={delay}
                  onChange={e => setDelay(Number(e.target.value))}
                  min={1}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Wait time between emails</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Hourly Limit</label>
                <input 
                  type="number" 
                  value={hourlyLimit}
                  onChange={e => setHourlyLimit(Number(e.target.value))}
                  min={1}
                  className="w-full bg-background border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                <p className="text-xs text-muted-foreground mt-1">Max emails per hour</p>
              </div>
            </div>
          </form>
        </div>
        
        <div className="px-6 py-4 border-t border-border bg-card flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors border border-transparent"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="compose-form"
            disabled={loading || emails.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary hover:bg-blue-600 text-primary-foreground rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <span className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"></span> : <Send className="w-4 h-4" />}
            Schedule Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
