import { Suspense, lazy, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { Layout } from "./components/Layout/Layout";
import { LoadingState } from "./components/Shared/UI";
import { useViewport } from "./hooks/useViewport";
import { ErrorBoundary } from "./components/Shared/ErrorBoundary";

const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Transactions = lazy(() =>
  import("./pages/Transactions").then((m) => ({ default: m.Transactions })),
);
const Reports = lazy(() =>
  import("./pages/Reports").then((m) => ({ default: m.Reports })),
);
const Calendar = lazy(() =>
  import("./pages/Calendar").then((m) => ({ default: m.Calendar })),
);
const Categories = lazy(() =>
  import("./pages/Categories").then((m) => ({ default: m.Categories })),
);
const LoginPage = lazy(() =>
  import("./pages/Auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const SignupPage = lazy(() =>
  import("./pages/Auth/SignupPage").then((m) => ({ default: m.SignupPage })),
);

export function App() {
  useViewport();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <BrowserRouter
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <Suspense fallback={<LoadingState />}>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="/lancamentos" element={<Transactions />} />
                      <Route path="/calendario" element={<Calendar />} />
                      <Route path="/categorias" element={<Categories />} />
                      <Route path="/relatorio-mensal" element={<Reports />} />
                      <Route
                        path="/despesas-variaveis"
                        element={
                          <Navigate
                            replace
                            to="/lancamentos?tipo=despesa&grupo=variaveis"
                          />
                        }
                      />
                      <Route
                        path="/despesas-fixas"
                        element={
                          <Navigate
                            replace
                            to="/lancamentos?tipo=despesa&grupo=fixas"
                          />
                        }
                      />
                      <Route
                        path="/rendas-variaveis"
                        element={
                          <Navigate
                            replace
                            to="/lancamentos?tipo=receita&grupo=variaveis"
                          />
                        }
                      />
                      <Route
                        path="/rendas-fixas"
                        element={
                          <Navigate
                            replace
                            to="/lancamentos?tipo=receita&grupo=fixas"
                          />
                        }
                      />
                      <Route
                        path="/historico-despesas"
                        element={
                          <Navigate
                            replace
                            to="/relatorio-mensal?aba=despesas"
                          />
                        }
                      />
                      <Route
                        path="/historico-rendas"
                        element={
                          <Navigate
                            replace
                            to="/relatorio-mensal?aba=receitas"
                          />
                        }
                      />
                    </Route>
                  </Route>
                  <Route
                    path="*"
                    element={
                      <div className="not-found">
                        <p className="subtle">ERRO 404</p>
                        <h1>Página não encontrada</h1>
                        <p className="subtle">
                          Esse endereço não está disponível.
                        </p>
                        <Link className="button button-primary" to="/">
                          Voltar ao início
                        </Link>
                      </div>
                    }
                  />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
