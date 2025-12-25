import { useState, useEffect } from 'react';
import api from '../utils/api';

interface User {
  id: string;
  username: string;
  email: string;
  profile?: {
    displayName?: string;
    bio?: string;
  };
}

export default function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  
  // Register/Login form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Profile edit state
  const [editUsername, setEditUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    // Check if user is logged in (simple check - in production use proper auth)
    const savedUserId = localStorage.getItem('userId');
    if (savedUserId) {
      loadUser(savedUserId);
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const res = await api.get(`/auth/user/${userId}`);
      if (res.data.success) {
        setUser(res.data.user);
        setIsLoggedIn(true);
        setEditUsername(res.data.user.username);
        setDisplayName(res.data.user.profile?.displayName || '');
        setBio(res.data.user.profile?.bio || '');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.removeItem('userId');
      setIsLoggedIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username, email, password });
      if (res.data.success) {
        localStorage.setItem('userId', res.data.user.id);
        await loadUser(res.data.user.id);
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
        await loadUser(res.data.user.id);
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
        bio
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

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('authToken');
    setUser(null);
    setIsLoggedIn(false);
    alert('✅ Logged out');
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-black rounded-lg p-8 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="mb-8 pb-6 border-b border-white/10">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </h2>
          <p className="text-white/50 text-sm">
            {isRegister ? 'Regístrate para gestionar tu perfil y wallets' : 'Accede a tu cuenta para gestionar tu perfil'}
          </p>
        </div>
        
        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5">
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
              Usuario
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder={isRegister ? "Elige un nombre de usuario" : "Usuario o email"}
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
                placeholder="tu@email.com"
                className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
              />
            </div>
          )}
          
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder={isRegister ? "Mínimo 6 caracteres" : "Tu contraseña"}
              className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
            />
          </div>
          
          {isRegister && (
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repite tu contraseña"
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
                  {isRegister ? 'Registrando...' : 'Iniciando...'}
                </span>
              ) : (
                isRegister ? 'Registrarse' : 'Iniciar Sesión'
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
              {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-black rounded-lg p-8 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/10">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Mi Perfil</h2>
            <p className="text-white/50 text-sm">Gestiona tu información personal y preferencias</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-black border border-red-500/40 hover:border-red-500/60 text-red-400 rounded-lg font-medium text-sm shadow-[0_2px_6px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.05)] hover:shadow-[0_4px_10px_rgba(239,68,68,0.3)] transition-all"
          >
            Cerrar Sesión
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
                {user?.profile?.displayName || user?.username || 'Usuario'}
              </div>
              <div className="text-white/60 text-sm">@{user?.username}</div>
              {user?.email && (
                <div className="text-white/40 text-xs mt-1">{user.email}</div>
              )}
            </div>
          </div>
        </div>
      
        {/* Edit Profile Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                required
                placeholder="Tu nombre de usuario"
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
              <p className="text-xs text-white/40 mt-1.5">El email no puede ser modificado</p>
            </div>
          </div>
          
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
              Nombre para Mostrar
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre completo o apodo (opcional)"
              className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all text-sm"
            />
          </div>
          
          <div>
            <label className="block text-white/70 text-sm font-medium mb-2 uppercase tracking-wider">
              Biografía
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Cuéntanos sobre ti..."
              rows={4}
              className="w-full px-4 py-2.5 bg-black border border-white/15 rounded-md text-white focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 shadow-[0_1px_3px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all resize-none text-sm"
            />
          </div>
          
          <div className="pt-4 border-t border-white/10">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-black border-2 border-white/20 hover:border-white/40 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_4px_10px_rgba(0,0,0,0.6)] transition-all"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </span>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Stats */}
      <div className="bg-black rounded-lg p-6 border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <h3 className="text-xl font-bold text-white mb-4">Información de la Cuenta</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-black/30 rounded-lg p-4 border border-white/10">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
              Miembro desde
            </div>
            <div className="text-white font-semibold">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'N/A'}
            </div>
          </div>
          <div className="bg-black/30 rounded-lg p-4 border border-white/10">
            <div className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">
              Última actualización
            </div>
            <div className="text-white font-semibold">
              {user?.updatedAt ? new Date(user.updatedAt).toLocaleDateString('es-ES', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

