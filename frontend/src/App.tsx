import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { Dashboard } from './pages/Dashboard';
import { Categories } from './pages/Categories';
import { FixedIncome } from './pages/Income/FixedIncome';
import { VariableIncome } from './pages/Income/VariableIncome';
import { FixedExpenses } from './pages/Expenses/FixedExpenses';
import { VariableExpenses } from './pages/Expenses/VariableExpenses';
import { ExpenseHistory } from './pages/History/ExpenseHistory';
import { IncomeHistory } from './pages/History/IncomeHistory';
import { Calendar } from './pages/Calendar';
import { Layout } from './components/Layout/Layout';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { MonthlyReport } from './pages/History/MonthlyReport';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FinanceProvider>
          <ThemeProvider>
            {/* Adicionadas as flags 'future' para remover os avisos do console */}
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                
                <Route element={<ProtectedRoute />}> 
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="categorias" element={<Categories />} />
                    <Route path="rendas-fixas" element={<FixedIncome />} />
                    <Route path="rendas-variaveis" element={<VariableIncome />} />
                    <Route path="despesas-fixas" element={<FixedExpenses />} />
                    <Route path="despesas-variaveis" element={<VariableExpenses />} />
                    <Route path="historico-despesas" element={<ExpenseHistory />} />
                    <Route path="historico-rendas" element={<IncomeHistory />} />
                    <Route path="relatorio-mensal" element={<MonthlyReport/>} />
                    <Route path="calendario" element={<Calendar />} />
                  </Route>
                </Route>
                
              </Routes>
            </Router>
          </ThemeProvider>
        </FinanceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}