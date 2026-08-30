import { useAuth } from '../context/AuthContext';
import { Mail, ArrowRight, BarChart3, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export function Login() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = () => {
    setIsLoading(true);
    login();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-20"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo & branding */}
        <div className="flex flex-col items-center mb-12">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-lg mb-4 transform hover:scale-105 transition-transform duration-300">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">ReachInbox</h1>
          <p className="text-gray-500 text-sm mt-2">Professional Email Scheduling</p>
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          {/* Header section */}
          <div className="px-8 py-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Sign in to schedule, manage, and track your email campaigns with precision. Join teams already using ReachInbox.
            </p>
          </div>

          {/* Sign-in button */}
          <div className="px-8 py-6 border-t border-gray-100">
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg disabled:cursor-not-allowed active:scale-98"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>

            {/* Disclaimer */}
            <p className="text-center text-xs text-gray-500 mt-6">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>

        {/* Features hint */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-center">
          <div className="group cursor-default">
            <div className="w-8 h-8 mx-auto mb-1 bg-blue-100 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600">Schedule</p>
          </div>
          <div className="group cursor-default">
            <div className="w-8 h-8 mx-auto mb-1 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600">Track</p>
          </div>
          <div className="group cursor-default">
            <div className="w-8 h-8 mx-auto mb-1 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-gray-600">Optimize</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center text-xs text-gray-500 pointer-events-none">
        <p>Trusted by teams worldwide</p>
      </div>

      <style>{`
        .group:hover { opacity: 0.8; }
        button:active { transform: scale(0.98); }
      `}</style>
    </div>
  );
}
