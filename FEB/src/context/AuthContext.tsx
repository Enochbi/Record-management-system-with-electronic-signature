import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, LoginCredentials, RegisterData } from '../types';
import { api } from '../api';
import toast from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('fgm_token');
    const storedUser = localStorage.getItem('fgm_user');
    
    if (storedToken && storedUser) {
      try {
        const decoded = jwtDecode(storedToken);
        const currentTime = Date.now() / 1000;
        
        if (decoded.exp && decoded.exp > currentTime) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          console.log('✅ Session restaurée pour:', JSON.parse(storedUser).username);
        } else {
          console.log('⚠️ Token expiré, nettoyage...');
          localStorage.removeItem('fgm_token');
          localStorage.removeItem('fgm_user');
        }
      } catch (error) {
        console.error('❌ Erreur lors de la restauration de session:', error);
        localStorage.removeItem('fgm_token');
        localStorage.removeItem('fgm_user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔐 Tentative de connexion pour:', credentials.username);
      
      const response = await api.post('/api/auth/login', credentials);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur de connexion');
      }
      
      const { token: newToken, user: userData } = response.data.data;
      
      setToken(newToken);
      setUser(userData);
      
      localStorage.setItem('fgm_token', newToken);
      localStorage.setItem('fgm_user', JSON.stringify(userData));
      
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('✅ Connexion réussie pour:', userData.username);
      toast.success(`Bienvenue ${userData.fullName} !`);
    } catch (error: any) {
      console.error('❌ Erreur de connexion:', error);
      
      let message = 'Erreur de connexion';
      
      if (error.response) {
        // Erreur de réponse du serveur
        if (error.response.status === 401) {
          message = 'Nom d\'utilisateur ou mot de passe incorrect';
        } else if (error.response.status === 500) {
          message = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else {
          message = error.response.data?.message || 'Erreur de connexion';
        }
      } else if (error.request) {
        // Erreur de réseau
        message = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        // Autre erreur
        message = error.message || 'Erreur inattendue';
      }
      
      toast.error(message);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      console.log('📝 Tentative d\'inscription pour:', data.username);
      
      // Validation côté client
      if (!data.username || data.username.length < 3) {
        throw new Error('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      }
      
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('Format d\'email invalide');
      }
      
      if (!data.password || data.password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }
      
      if (!data.fullName || data.fullName.length < 2) {
        throw new Error('Le nom complet est requis');
      }
      
      if (!data.position || !data.department) {
        throw new Error('Le poste et le département sont requis');
      }
      
      const response = await api.post('/api/auth/register', data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur d\'inscription');
      }
      
      console.log('✅ Inscription réussie pour:', data.username);
      toast.success('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur d\'inscription:', error);
      
      let message = 'Erreur d\'inscription';
      
      if (error.response) {
        // Erreur de réponse du serveur
        if (error.response.status === 400) {
          message = error.response.data?.message || 'Données invalides';
        } else if (error.response.status === 500) {
          message = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else {
          message = error.response.data?.message || 'Erreur d\'inscription';
        }
      } else if (error.request) {
        // Erreur de réseau
        message = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        // Erreur de validation ou autre
        message = error.message || 'Erreur inattendue';
      }
      
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    console.log('👋 Déconnexion de:', user?.username);
    
    setUser(null);
    setToken(null);
    localStorage.removeItem('fgm_token');
    localStorage.removeItem('fgm_user');
    delete api.defaults.headers.common['Authorization'];
    
    toast.success('Déconnexion réussie');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};