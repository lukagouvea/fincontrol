import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingCard } from "../ui/Skeleton";
import { useAuth } from "../context/AuthContext";

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, signedOut, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingCard label="Carregando sua conta…" />;
  }

  if (isAuthenticated) return <Outlet />;
  // Quem abre o app sem sessão vê as boas-vindas; links internos levam ao login.
  if (location.pathname === "/" && !location.search) return <Navigate to="/boas-vindas" replace />;
  // Saiu de propósito: o próximo login começa no Início, não na tela de onde saiu.
  if (signedOut) return <Navigate to="/entrar" replace />;
  // Sessão expirada ou link direto: depois de entrar, volta para a tela pedida.
  return <Navigate to="/entrar" replace state={{ from: location.pathname + location.search }} />;
};
