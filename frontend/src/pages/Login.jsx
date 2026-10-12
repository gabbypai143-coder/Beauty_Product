import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState(() => localStorage.getItem('jammaila_remembered_email') || '');
  const [password, setPassword] = useState(() => localStorage.getItem('jammaila_remembered_pass') || '');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please provide both username/email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || data?.message || 'Invalid administrative credentials.');
      }

      if (!data?.token) {
        throw new Error('Authentication succeeded but server returned no token.');
      }

      // Store remember me
      if (rememberMe) {
        localStorage.setItem('jammaila_remembered_email', email.trim().toLowerCase());
        localStorage.setItem('jammaila_remembered_pass', password.trim());
      } else {
        localStorage.removeItem('jammaila_remembered_email');
        localStorage.removeItem('jammaila_remembered_pass');
      }

      login(data.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#235848] hover:text-[#194437] transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          <span>Back to Storefront</span>
        </Link>

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#e9f2ee] text-[#235848] mx-auto flex items-center justify-center shadow-sm">
            <Lock size={26} />
          </div>
          <h2 className="font-serif text-3xl font-bold text-[#1b2420]">
            Jammaila-skin Admin
          </h2>
          <p className="text-xs text-[#63706a]">
            Enter your authorized administrative credentials to access store operations.
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-[#235848]/10 shadow-xl space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Username / Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin"
                  className="w-full pl-10 pr-4 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#235848]/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#faf8f5] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#235848]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-[#235848] focus:ring-[#235848]"
                />
                <span>Remember credentials</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary py-3.5 text-sm font-bold shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] text-[#63706a]">
            <ShieldCheck size={14} className="text-[#235848]" />
            <span>Encrypted Session &bull; Authorized Personnel Only</span>
          </div>
        </div>
      </div>
    </div>
  );
};
