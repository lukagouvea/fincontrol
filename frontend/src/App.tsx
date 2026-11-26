import { Suspense, lazy, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { TransactionEditorProvider } from "./app/TransactionEditor";
import { PendingDeletesProvider } from "./app/PendingDeletes";
import { MonthProvider } from "./app/MonthContext";
import { ErrorBoundary } from "./components/Shared/ErrorBoundary";
import { useViewport } from "./hooks/useViewport";
import { AppShell } from "./app/AppShell";
import { ToastProvider } from "./ui/Toast";
import { ButtonLink } from "./ui/Button";
import { LoadingCard } from "./ui/Skeleton";

const named = <K extends string>(
  loader: () => Promise<Record<K, React.ComponentType>>,
  name: K,
) => lazy(() => loader().then((m) => ({ default: m[name] })));

const Dashboard = named(() => import("./pages/Dashboard"), "Dashboard");
const Transactions = named(() => import("./pages/Transactions"), "Transactions");
const Recurring = named(() => import("./pages/Recurring"), "Recurring");
const Reports = named(() => import("./pages/Reports"), "Reports");
const Calendar = named(() => import("./pages/Calendar"), "Calendar");
const Categories = named(() => import("./pages/Categories"), "Categories");
const Settings = named(() => import("./pages/Settings"), "Settings");
const LoginPage = named(() => import("./pages/Auth/LoginPage"), "LoginPage");
const SignupPage = named(() => import("./pages/Auth/SignupPage"), "SignupPage");
const ComingSoon = lazy(() =>
  import("./pages/ComingSoon").then((m) => ({ default: m.ComingSoon })),
);

/** Redireciona mantendo a query string (?tipo=…&aba=…). */
function RedirectKeepingSearch({ to, extra }: { to: string; extra?: string }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  if (extra) new URLSearchParams(extra).forEach((value, key) => params.set(key, value));
  const query = params.toString();
  return <Navigate replace to={query ? `${to}?${query}` : to} />;
}

/** /lancamentos?grupo=fixas virou Recorrentes; o resto virou Transações. */
function LegacyEntries() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const fixed = params.get("grupo") === "fixas";
  params.delete("grupo");
  const query = params.toString();
  const to = fixed ? "/recorrentes" : "/transacoes";
  return <Navigate replace to={query ? `${to}?${query}` : to} />;
}

function ShellLayout() {
  return (
    <MonthProvider>
      <PendingDeletesProvider>
        <TransactionEditorProvider>
          <AppShell />
        </TransactionEditorProvider>
      </PendingDeletesProvider>
    </MonthProvider>
  );
}

function PageFallback() {
  return <LoadingCard label="Carregando a página…" />;
}

function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-5 text-center text-ink">
      <p className="text-sm font-semibold text-muted">ERRO 404</p>
      <h1 className="font-num text-[28px] font-semibold">Página não encontrada</h1>
      <p className="text-[15px] text-muted">Esse endereço não está disponível.</p>
      <ButtonLink to="/" size="lg" className="mt-2">
        Voltar ao início
      </ButtonLink>
    </main>
  );
}

const soon = {
  cartoes: "Cartões, faturas e compromissos chegam numa próxima etapa.",
  orcamento: "Orçamento mensal, limites por categoria e limite da semana chegam numa próxima etapa.",
  metas: "Metas e “Guardar na meta” chegam numa próxima etapa.",
  alertas: "A central de alertas chega numa próxima etapa.",
};

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
          <ToastProvider>
            <ErrorBoundary>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/entrar" element={<LoginPage />} />
                    <Route path="/criar-conta" element={<SignupPage />} />
                    <Route path="/login" element={<Navigate replace to="/entrar" />} />
                    <Route path="/signup" element={<Navigate replace to="/criar-conta" />} />
                    <Route element={<ProtectedRoute />}>
                      <Route element={<ShellLayout />}>
                        <Route
                          element={
                            <Suspense fallback={<PageFallback />}>
                              <Outlet />
                            </Suspense>
                          }
                        >
                          <Route index element={<Dashboard />} />
                          <Route path="/transacoes" element={<Transactions />} />
                          <Route path="/recorrentes" element={<Recurring />} />
                          <Route path="/relatorios" element={<Reports />} />
                          <Route path="/categorias" element={<Categories />} />
                          <Route path="/ajustes" element={<Settings />} />
                          <Route path="/cartoes" element={<ComingSoon title="Cartões" description={soon.cartoes} />} />
                          <Route path="/orcamento" element={<ComingSoon title="Orçamento" description={soon.orcamento} />} />
                          <Route path="/metas" element={<ComingSoon title="Metas" description={soon.metas} />} />
                          <Route path="/alertas" element={<ComingSoon title="Alertas" description={soon.alertas} />} />
                          {/* Sai na Fase 2 (fora do design). */}
                          <Route path="/calendario" element={<Calendar />} />
                        </Route>
                        {/* Endereços antigos */}
                        <Route path="/lancamentos" element={<LegacyEntries />} />
                        <Route path="/relatorio-mensal" element={<RedirectKeepingSearch to="/relatorios" />} />
                        <Route path="/despesas-variaveis" element={<RedirectKeepingSearch to="/transacoes" extra="tipo=despesa" />} />
                        <Route path="/despesas-fixas" element={<RedirectKeepingSearch to="/recorrentes" extra="tipo=despesa" />} />
                        <Route path="/rendas-variaveis" element={<RedirectKeepingSearch to="/transacoes" extra="tipo=receita" />} />
                        <Route path="/rendas-fixas" element={<RedirectKeepingSearch to="/recorrentes" extra="tipo=receita" />} />
                        <Route path="/historico-despesas" element={<RedirectKeepingSearch to="/relatorios" extra="aba=despesas" />} />
                        <Route path="/historico-rendas" element={<RedirectKeepingSearch to="/relatorios" extra="aba=receitas" />} />
                      </Route>
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
