import React from 'react';
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
export function App() {
  return <AuthProvider>
      <FinanceProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="categorias" element={<Categories />} />
              <Route path="rendas-fixas" element={<FixedIncome />} />
              <Route path="rendas-variaveis" element={<VariableIncome />} />
              <Route path="despesas-fixas" element={<FixedExpenses />} />
              <Route path="despesas-variaveis" element={<VariableExpenses />} />
              <Route path="historico-despesas" element={<ExpenseHistory />} />
              <Route path="historico-rendas" element={<IncomeHistory />} />
              <Route path="calendario" element={<Calendar />} />
            </Route>
          </Routes>
        </Router>
      </FinanceProvider>
    </AuthProvider>;
}