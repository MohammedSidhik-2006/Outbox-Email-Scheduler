import { useState, useRef } from 'react';
import { X, Upload, Send, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ComposeEmailModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [delay, setDelay] = useState(60);
  const [hourlyLimit, setHourlyLimit] = useState(50);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress(25);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadProgress(50);
      const text = event.target?.result as string;
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const foundEmails = text.match(emailRegex) || [];
      
      const uniqueEmails = [...new Set(foundEmails)];
      setEmails(uniqueEmails);
      setUploadProgress(100);
      
      if (uniqueEmails.length === 0) {
        setError('No valid email addresses found in the file.');
      } else {
        setError('');
        setTimeout(() => setUploadProgress(0), 500);
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

    if (!user) {
      setError('You must be logged in to schedule campaigns.');
      return;
    }

    setLoading(true);
    try {
      const senderEmail = user.email;
      const senderName = user.name || user.email;
      
      const senderResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/senders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: senderEmail, name: senderName })
      }).catch(() => null);

      let senderId = '';
      if (senderResponse?.ok) {
        const senderData = await senderResponse.json();
        senderId = senderData.data?.id || '';
      }

      if (!senderId) {
        senderId = senderEmail;
      }

      const campaignResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emails/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          senderId,
          recipients: emails,
          subject,
          body,
          startAt: new Date().toISOString(),
          delayBetweenEmails: delay * 1000,
          hourlyLimit,
          idempotencyKey: `campaign-${Date.now()}-${Math.random()}`
        })
      });

      if (campaignResponse.ok) {
        setSuccess(`✓ Campaign scheduled! ${emails.length} email${emails.length !== 1 ? 's' : ''} will be sent.`);
        setTimeout(() => onClose(), 2000);
      } else {
        const data = await campaignResponse.json();
        setError(data.message || 'Failed to schedule campaign');
      }
    } catch (err) {
      setError('An unexpected error occurred: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[95vh]">
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Create Campaign</h2>
            <p className="text-xs sm:text-xs text-gray-500 mt-1">Schedule emails to be sent automatically</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer flex-shrink-0"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-4 sm:px-8 py-6 sm:py-8 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3" role="alert">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium flex items-start gap-3" role="status">
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs">✓</span>
              </div>
              <div>{success}</div>
            </div>
          )}
          
          <form id="compose-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Subject field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Subject *</label>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="e.g., Exciting Job Opportunity at Our Company"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-400 cursor-text"
              />
            </div>
            
            {/* Body field */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Message Body *</label>
              <textarea 
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your email message here. Use professional language and a clear call to action..."
                rows={6}
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none placeholder-gray-400 cursor-text"
              ></textarea>
              <p className="text-xs text-gray-500 mt-1">{body.length} characters</p>
            </div>
            
            {/* File upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Recipient Email List *</label>
              <div 
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-lg p-8 flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadProgress > 0 && uploadProgress < 100 ? (
                  <>
                    <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mb-2">
                      <div className="text-xl">{uploadProgress}%</div>
                    </div>
                    <p className="text-sm font-medium text-blue-700">Uploading...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-blue-600 mb-3" />
                    <p className="text-sm font-semibold text-gray-900">Click to upload email list</p>
                    <p className="text-xs text-gray-600 mt-1">CSV or TXT file format</p>
                  </>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.txt"
                  className="hidden" 
                />
              </div>
              
              {/* Success indicator */}
              {emails.length > 0 && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-700">
                    ✓ {emails.length} email{emails.length !== 1 ? 's' : ''} ready
                  </p>
                </div>
              )}
            </div>
            
            {/* Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Delay Between Emails</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={delay}
                    onChange={e => setDelay(Number(e.target.value))}
                    min={1}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                  />
                  <span className="text-xs text-gray-600">seconds</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Min wait between emails</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Hourly Limit</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={hourlyLimit}
                    onChange={e => setHourlyLimit(Number(e.target.value))}
                    min={1}
                    className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text"
                  />
                  <span className="text-xs text-gray-600">emails/hr</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Max emails per hour</p>
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer */}
        <div className="px-4 sm:px-8 py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="compose-form"
            disabled={loading || emails.length === 0}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:shadow-none cursor-pointer"
            title={emails.length === 0 ? 'Upload an email list to continue' : 'Schedule this campaign'}
          >
            {loading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Schedule Campaign
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
