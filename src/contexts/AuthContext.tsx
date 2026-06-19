"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '@/lib/api';
import AuthTransition from '@/components/AuthTransition';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isLogged: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  loginWithTransition: (token: string, adminValue: boolean, redirectUrl: string) => void;
  admin: (value: boolean) => void;
  logout: () => void;
  logoutWithTransition: () => void;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLogged, setIsLogged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [transitionState, setTransitionState] = useState<{ isVisible: boolean; type: "login" | "logout"; redirectUrl?: string }>({
    isVisible: false,
    type: "login"
  });
  const router = useRouter();

  // Função para verificar se o token é válido
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsLogged(false);
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const response = await api.get('/verify-token');

      if (response.status === 200) {
        setIsLogged(true);
        const profile = await api.get('/profile');
        const isAdminUser = profile.data?.rule === "Admin";
        setIsAdmin(isAdminUser);
        localStorage.setItem('admin', JSON.stringify(isAdminUser));
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('admin');
        setIsLogged(false);
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('admin');
      setIsLogged(false);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };


  // Função para fazer login
  const login = (token: string) => {
    localStorage.setItem('token', token);
    setIsLogged(true);
  };

  const admin = (value: boolean) => {
    localStorage.setItem('admin', JSON.stringify(value));
    setIsAdmin(value);
  };

  const loginWithTransition = (token: string, adminValue: boolean, redirectUrl: string) => {
    setTransitionState({ isVisible: true, type: "login", redirectUrl });
    // We set the actual auth state after transition or during it
    setTimeout(() => {
      login(token);
      admin(adminValue);
    }, 1000); // Set auth state mid-transition
  };

  // Função para fazer logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    setIsLogged(false);
    setIsAdmin(false);
  };

  const logoutWithTransition = () => {
    setTransitionState({ isVisible: true, type: "logout", redirectUrl: "/login" });
    setTimeout(() => {
      logout();
    }, 1000);
  };

  const handleTransitionComplete = () => {
    if (transitionState.redirectUrl) {
      router.push(transitionState.redirectUrl);
    }
    setTransitionState(prev => ({ ...prev, isVisible: false }));
  };

  // Verificar autenticação ao montar o componente
  useEffect(() => {
    checkAuth();
  }, []);

  // Verificar autenticação quando a página ganha foco (usuário volta para a aba)
  useEffect(() => {
    const handleFocus = () => {
      checkAuth();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const value: AuthContextType = {
    isLogged,
    isAdmin,
    isLoading,
    admin,
    login,
    loginWithTransition,
    logout,
    logoutWithTransition,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AuthTransition 
        isVisible={transitionState.isVisible} 
        type={transitionState.type} 
        onComplete={handleTransitionComplete} 
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}