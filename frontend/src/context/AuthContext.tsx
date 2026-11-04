import React, {
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { User, LoginCredentials, SignupCredentials } from "../types/AuthTypes";
import { authService } from "../services/authService";
import { useQueryClient } from "@tanstack/react-query";

type AuthContextType = {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Adicionado estado de loading global
  sessionVersion: number;
  isCurrentSession: (version: number) => boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const queryClient = useQueryClient();
  const activeSession = useRef(0);
  const [sessionVersion, setSessionVersion] = useState(0);
  const isCurrentSession = useCallback(
    (version: number) => activeSession.current === version,
    [],
  );
  const resetSessionCache = () => {
    activeSession.current += 1;
    setSessionVersion(activeSession.current);
    queryClient.clear();
  };
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Começa true para verificar localStorage

  // Verifica autenticação ao carregar (Persistência no Refresh)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await authService.me(); // Pergunta pro backend: "Quem sou eu?"
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        // Se der erro, apenas segue como deslogado
        setCurrentUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const { user } = await authService.login(credentials);
      resetSessionCache();

      // Atualiza estado
      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error; // Repassa o erro para o componente tratar (ex: mostrar mensagem)
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (credentials: SignupCredentials) => {
    setIsLoading(true);
    try {
      const { user } = await authService.signup(credentials);
      resetSessionCache();

      setCurrentUser(user);
      setIsAuthenticated(true);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    resetSessionCache();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated,
      isLoading,
      sessionVersion,
      isCurrentSession,
      login,
      signup,
      logout,
    }),
    [currentUser, isAuthenticated, isLoading, sessionVersion, isCurrentSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
