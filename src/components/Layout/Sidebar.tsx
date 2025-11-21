import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, TagIcon, DollarSignIcon, CoinsIcon, CreditCardIcon, ShoppingCartIcon, CalendarIcon, ClockIcon, LogOutIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
export const Sidebar: React.FC = () => {
  const {
    logout
  } = useAuth();
  return <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-blue-600">FinControl</h1>
        <p className="text-sm text-gray-500">Controle financeiro pessoal</p>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          <li>
            <NavLink to="/" className={({
            isActive
          }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
              <HomeIcon className="w-5 h-5 mr-3" />
              Dashboard
            </NavLink>
          </li>
          <li className="pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
              Gerenciamento
            </div>
            <ul className="space-y-1">
              <li>
                <NavLink to="/categorias" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <TagIcon className="w-5 h-5 mr-3" />
                  Categorias
                </NavLink>
              </li>
              <li>
                <NavLink to="/rendas-fixas" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <DollarSignIcon className="w-5 h-5 mr-3" />
                  Rendas Fixas
                </NavLink>
              </li>
              <li>
                <NavLink to="/rendas-variaveis" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <CoinsIcon className="w-5 h-5 mr-3" />
                  Rendas Variáveis
                </NavLink>
              </li>
              <li>
                <NavLink to="/despesas-fixas" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <CreditCardIcon className="w-5 h-5 mr-3" />
                  Despesas Fixas
                </NavLink>
              </li>
              <li>
                <NavLink to="/despesas-variaveis" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <ShoppingCartIcon className="w-5 h-5 mr-3" />
                  Despesas Variáveis
                </NavLink>
              </li>
            </ul>
          </li>
          <li className="pt-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-4">
              Consultas
            </div>
            <ul className="space-y-1">
              <li>
                <NavLink to="/calendario" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <CalendarIcon className="w-5 h-5 mr-3" />
                  Calendário
                </NavLink>
              </li>
              <li>
                <NavLink to="/historico-despesas" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <ClockIcon className="w-5 h-5 mr-3" />
                  Histórico de Gastos
                </NavLink>
              </li>
              <li>
                <NavLink to="/historico-rendas" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <ClockIcon className="w-5 h-5 mr-3" />
                  Histórico de Rendas
                </NavLink>
              </li>
              <li>
                <NavLink to="/relatorio-mensal" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <ClockIcon className="w-5 h-5 mr-3" />
                  Relatório Mensal
                </NavLink>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <button onClick={logout} className="flex items-center w-full px-4 py-2 text-gray-700 rounded-md hover:bg-gray-100">
          <LogOutIcon className="w-5 h-5 mr-3" />
          Sair
        </button>
      </div>
    </aside>;
};