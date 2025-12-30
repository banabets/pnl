import { useState, useEffect } from 'react';
import api from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastLogin?: string;
  role: 'user' | 'admin' | 'premium';
  status: 'active' | 'suspended' | 'banned';
  profile?: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    timezone?: string;
    language?: string;
  };
  settings?: {
    theme?: 'light' | 'dark' | 'auto';
    notifications?: {
      email?: boolean;
      priceAlerts?: boolean;
      tradeAlerts?: boolean;
    };
    trading?: {
      defaultSlippage?: number;
      defaultWalletIndex?: number;
    };
  };
  stats?: {
    totalTrades?: number;
    totalVolume?: number;
    totalProfit?: number;
    winRate?: number;
  };
}

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'security' | 'activity'>('profile');
  
  // Register/Login form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile edit state
  const [editUsername, setEditUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [timezone, setTimezone] = useState('');
  const [language, setLanguage] = useState('');
  
  // Settings state
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('dark');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [tradeAlerts, setTradeAlerts] = useState(true);
  const [defaultSlippage, setDefaultSlippage] = useState(1);
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Activity logs
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoggedIn && user) {
      loadActivityLogs();
    }
  }, [isLoggedIn, user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const res = await api.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.user);
          setIsLoggedIn(true);
          loadUserData(res.data.user);
        } else {
          // Only clear token if explicitly told to
          setIsLoggedIn(false);
        }
      } catch (error: any) {
        console.error('Auth check failed:', error);
        
        // Handle rate limit errors (429) - don't clear token, just wait
        if (error.response?.status === 429) {
          console.warn('Rate limit exceeded, keeping session but not updating user data');
          // Keep the token and assume we're still logged in
          // The rate limit will reset soon
          return;
        }
        
        // Only clear token if it's a real authentication error (401 with auth error message)
        // Don't clear on network errors or other temporary issues
        if (error.response?.status === 401 && 
            (error.response?.data?.error?.includes('token') || 
             error.response?.data?.error?.includes('Authentication') ||
             error.response?.data?.error?.includes('expired'))) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userId');
          setIsLoggedIn(false);
        }
        // For network errors or other issues, keep the token and just mark as not logged in
        // The token might still be valid, we just couldn't verify it right now
      }
    } else {
      setIsLoggedIn(false);
    }
  };

  const loadUserData = (userData: User) => {
    setEditUsername(userData.username);
    setDisplayName(userData.profile?.displayName || '');
    setBio(userData.profile?.bio || '');
    setTimezone(userData.profile?.timezone || '');
    setLanguage(userData.profile?.language || '');
    
    if (userData.settings) {
      setTheme(userData.settings.theme || 'dark');
      setEmailNotifications(userData.settings.notifications?.email ?? true);
      setPriceAlerts(userData.settings.notifications?.priceAlerts ?? true);
      setTradeAlerts(userData.settings.notifications?.tradeAlerts ?? true);
      setDefaultSlippage(userData.settings.trading?.defaultSlippage || 1);
    }
  };

  const loadActivityLogs = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/auth/user/${user.id}/activity?limit=50`);
      if (res.data.success) {
        setActivityLogs(res.data.logs);
      }
    } catch (error) {
      console.error('Failed to load activity logs:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      alert('Password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username, email, password });
      if (res.data.success) {
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('authToken', res.data.token);
        setUser(res.data.user);
        setIsLoggedIn(true);
        loadUserData(res.data.user);
        // Notify App.tsx about auth change
        window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', newValue: res.data.token }));
        alert('✅ Registration successful!');
        setIsRegister(false);
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { usernameOrEmail: username, password });
      if (res.data.success) {
        localStorage.setItem('userId', res.data.user.id);
        localStorage.setItem('authToken', res.data.token);
        setUser(res.data.user);
        setIsLoggedIn(true);
        loadUserData(res.data.user);
        // Notify App.tsx about auth change
        window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', newValue: res.data.token }));
        alert('✅ Login successful!');
        setUsername('');
        setPassword('');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api.put(`/auth/user/${user.id}/profile`, {
        username: editUsername,
        displayName,
        bio,
        timezone,
        language
      });
      if (res.data.success) {
        setUser(res.data.user);
        alert('✅ Profile updated successfully!');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api.put(`/auth/user/${user.id}/settings`, {
        theme,
        notifications: {
          email: emailNotifications,
          priceAlerts,
          tradeAlerts
        },
        trading: {
          defaultSlippage
        }
      });
      if (res.data.success) {
        setUser(res.data.user);
        alert('✅ Settings updated successfully!');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmNewPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('New password must be at least 8 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post(`/auth/user/${user.id}/change-password`, {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        alert('✅ Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('userId');
    localStorage.removeItem('authToken');
    setUser(null);
    setIsLoggedIn(false);
    // Notify App.tsx about auth change
    window.dispatchEvent(new StorageEvent('storage', { key: 'authToken', newValue: null }));
    alert('✅ Logged out');
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-black rounded-lg p-8 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="mb-8 pb-6 border-b border-white/10">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>
          <p className="text-white/50 text-sm">
            {isRegister ? 'Sign up to manage your profile and wallets' : 'Sign in to access your account'}
          </p>
        </div>
        
        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={isRegister ? "Choose a username" : "Username or email"}
              className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
            />
          </div>
          
          {isRegister && (
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
          )}
          
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isRegister ? "Minimum 8 characters" : "Your password"}
              className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
            />
          </div>
          
          {isRegister && (
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repeat your password"
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
          )}
          
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-black border-2 border-white/20 hover:border-white/40 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {isRegister ? 'Signing up...' : 'Signing in...'}
                </span>
              ) : (
                isRegister ? 'Sign Up' : 'Sign In'
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setUsername('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="px-6 py-3 bg-black border border-white/15 hover:border-white/30 text-white rounded-lg font-medium shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_2px_6px_rgba(0,0,0,0.4)] transition-all text-sm"
            >
              {isRegister ? 'Already have an account' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-black rounded-lg p-8 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">My Profile</h2>
            <p className="text-white/50 text-sm">Manage your account and preferences</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-black border border-red-500/40 hover:border-red-500/60 text-red-400 rounded-lg font-medium text-sm shadow-[0_2px_6px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_10px_rgba(239,68,68,0.3)] transition-all"
          >
            Sign Out
          </button>
        </div>

        {/* User Info Card */}
        <div className="mb-8 p-5 bg-black/30 rounded-lg border border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-white mb-1">
                {user?.profile?.displayName || user?.username || 'User'}
              </div>
              <div className="text-white/60 text-sm">@{user?.username}</div>
              {user?.email && (
                <div className="text-white/40 text-xs mt-1">{user.email}</div>
              )}
              {user?.stats && (
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-white/50">Trades: {user.stats.totalTrades || 0}</span>
                  <span className="text-white/50">Volume: {(user.stats.totalVolume || 0).toFixed(2)} SOL</span>
                  <span className="text-white/50">P&L: {(user.stats.totalProfit || 0).toFixed(4)} SOL</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          {(['profile', 'settings', 'security', 'activity'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
                />
              </div>
              
              <div>
                <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-black/50 border border-white/10 rounded-md text-white/50 cursor-not-allowed text-sm"
                />
                <p className="text-xs text-white/40 mt-1.5">Email cannot be modified</p>
              </div>
            </div>
            
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name or nickname (optional)"
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
            
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all resize-none text-sm"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black border-2 border-white/20 hover:border-white/40 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-3 uppercase tracking-wider">
                Notifications
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black text-white focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-white/80 text-sm">Email notifications</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={priceAlerts}
                    onChange={(e) => setPriceAlerts(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black text-white focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-white/80 text-sm">Price alerts</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tradeAlerts}
                    onChange={(e) => setTradeAlerts(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black text-white focus:ring-2 focus:ring-white/20"
                  />
                  <span className="text-white/80 text-sm">Trade alerts</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Default Slippage (%)
              </label>
              <input
                type="number"
                value={defaultSlippage}
                onChange={(e) => setDefaultSlippage(parseFloat(e.target.value))}
                min="0.1"
                max="50"
                step="0.1"
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>

            <button
              onClick={handleUpdateSettings}
              disabled={loading}
              className="w-full px-6 py-3 bg-black border-2 border-white/20 hover:border-white/40 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
            
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
            
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black border-2 border-white/20 hover:border-white/40 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activityLogs.length > 0 ? (
              activityLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-black/30 rounded-lg border border-white/10"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white font-medium text-sm">{log.action}</span>
                    <span className="text-white/40 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {log.details && (
                    <div className="text-white/60 text-xs mt-1">
                      {JSON.stringify(log.details, null, 2)}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/50">
                No activity logs yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
