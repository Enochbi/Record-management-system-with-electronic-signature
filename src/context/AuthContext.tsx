import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, UserRole } from "../types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (userData: User) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: UserRole) => boolean;
  getToken: () => string;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifie la validité du token
  const validateToken = (token: string): boolean => {
    if (!token) return false;
    try {
      // Décodage basique du token pour vérifier l'expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  };

  // Charge et valide l'utilisateur au démarrage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          if (userData.token && validateToken(userData.token)) {
            setUser(userData);
          } else {
            localStorage.removeItem("user");
          }
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        localStorage.removeItem("user");
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Connexion avec validation
  const login = async (userData: User) => {
    if (!userData.token) {
      throw new Error("Token manquant dans la réponse du serveur");
    }

    const userWithToken = {
      ...userData,
      token: userData.token
    };

    localStorage.setItem("user", JSON.stringify(userWithToken));
    setUser(userWithToken);
  };

  // Déconnexion avec nettoyage complet
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    // Ajoutez ici d'autres nettoyages si nécessaire
  };

  // Récupération sécurisée du token
  const getToken = (): string => {
    if (user?.token && validateToken(user.token)) {
      return user.token;
    }

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData.token && validateToken(userData.token)) {
          return userData.token;
        }
      } catch (error) {
        console.error("Token invalide:", error);
      }
    }
    
    logout(); // Déconnecte si le token est invalide
    return "";
  };

  // Rafraîchissement des données utilisateur
  const refreshUserData = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        login(userData);
      } else if (response.status === 401) {
        logout();
      }
    } catch (error) {
      console.error("Failed to refresh user data:", error);
      logout();
    }
  };

  // Vérification des rôles
  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user && validateToken(getToken()),
    hasRole,
    getToken,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};