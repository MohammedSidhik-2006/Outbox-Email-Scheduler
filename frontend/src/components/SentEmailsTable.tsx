import { useState, useEffect } from 'react';
import { Mail, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

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

  if (loading) return (
    <div className="p-12 text-center">
      <div className="inline-flex flex-col items-center">
        <Loader2 className="w-8 h-8 text-green-500 mb-3 animate-spin" />
        <p className="text-gray-600">Loading sent emails...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="p-12 text-center">
      <div className="inline-flex flex-col items-center">
        <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
        <p className="text-red-600 font-medium">Error: {error}</p>
      </div>
    </div>
  );

  if (emails.length === 0) return (
    <div className="p-12 text-center">
      <div className="inline-flex flex-col items-center">
        <Mail className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-700 font-medium">No sent emails yet</p>
        <p className="text-gray-500 text-sm mt-1">Your sent emails will appear here</p>
      </div>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" role="table" aria-label="Sent emails table">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 sticky top-0">
            <tr role="row">
              <th className="px-6 py-4 font-semibold text-gray-900" role="columnheader">Email</th>
              <th className="px-6 py-4 font-semibold text-gray-900" role="columnheader">Subject</th>
              <th className="px-6 py-4 font-semibold text-gray-900" role="columnheader">Sent</th>
              <th className="px-6 py-4 font-semibold text-gray-900" role="columnheader">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {emails.map((email) => (
              <tr key={email.id} className="hover:bg-green-50/50 transition-colors cursor-default" role="row">
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">{email.recipient}</td>
                <td className="px-6 py-4 text-sm truncate max-w-xs text-gray-600">{email.campaign?.subject || '(no subject)'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(email.sentAt).toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  {email.status === 'SENT' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200" role="status" aria-label="Status: Successfully sent">
                      <span>✓</span>
                      Sent
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200" role="status" aria-label="Status: Failed to send">
                      <span>✗</span>
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {total > 50 && (
        <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 text-sm text-gray-600 bg-gray-50">
          <span>Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total}</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(Math.max(1, page - 1))} 
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button 
              onClick={() => setPage(page + 1)} 
              disabled={page * 50 >= total}
              className="flex items-center gap-1 px-3 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Next page"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
