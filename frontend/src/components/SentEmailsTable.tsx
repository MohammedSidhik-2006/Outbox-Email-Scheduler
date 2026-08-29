import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

interface Email {
  id: string;
  recipient: string;
  campaign: { subject: string };
  sentAt: string;
  status: string;
}

export function SentEmailsTable({ searchQuery }: { searchQuery: string }) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSentEmails();
  }, [page, searchQuery]);

  const fetchSentEmails = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = searchQuery ? `?q=${searchQuery}&page=${page}` : `?page=${page}`;
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/emails/sent${query}`,
        { credentials: 'include' }
      );
      
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      
      if (!response.ok) throw new Error('Failed to fetch sent emails');
      
      const data = await response.json();
      setEmails(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading sent emails...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  if (emails.length === 0) return <div className="p-8 text-center text-muted-foreground flex flex-col items-center"><Mail className="w-8 h-8 mb-2 opacity-50"/>No sent emails found</div>;

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-card border-b border-border text-muted-foreground sticky top-0">
            <tr>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Subject</th>
              <th className="px-6 py-4 font-medium">Sent Time</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 text-sm">{email.recipient}</td>
                <td className="px-6 py-4 text-sm truncate max-w-[200px] text-muted-foreground">{email.campaign?.subject}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(email.sentAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {email.status === 'SENT' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">
                      <CheckCircle className="w-3.5 h-3.5" /> Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                      <XCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {total > 0 && (
        <div className="flex justify-between items-center px-6 py-4 border-t border-border text-sm text-muted-foreground">
          <span>Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(Math.max(1, page - 1))} 
              disabled={page === 1}
              className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              onClick={() => setPage(page + 1)} 
              disabled={page * 50 >= total}
              className="px-3 py-1 rounded border border-border hover:bg-muted disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
