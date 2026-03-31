import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, TagIcon, DollarSignIcon, CoinsIcon, CreditCardIcon, ShoppingCartIcon, CalendarIcon, ClockIcon } from 'lucide-react';
export const Sidebar: React.FC = () => {
  return <aside className="w-64 h-full bg-white border-r border-gray-200 flex flex-col">
      <NavLink to="/" className="p-4 border-b border-gray-200 block">
        <h1 className="text-xl font-bold text-blue-600">FinControl</h1>
        <p className="text-sm text-gray-500">Controle financeiro pessoal</p>
      </NavLink>
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
                <NavLink id="menu-categories" to="/categorias" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <TagIcon className="w-5 h-5 mr-3" />
                  Categorias
                </NavLink>
              </li>
              <li>
                <NavLink id="menu-fixed-income" to="/rendas-fixas" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <DollarSignIcon className="w-5 h-5 mr-3" />
                  Rendas Fixas
                </NavLink>
              </li>
              <li>
                <NavLink id="menu-variable-income" to="/rendas-variaveis" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <CoinsIcon className="w-5 h-5 mr-3" />
                  Rendas Variáveis
                </NavLink>
              </li>
              <li>
                <NavLink id="menu-fixed-expenses" to="/despesas-fixas" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <CreditCardIcon className="w-5 h-5 mr-3" />
                  Despesas Fixas
                </NavLink>
              </li>
              <li>
                <NavLink id="menu-variable-expenses" to="/despesas-variaveis" className={({
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
                <NavLink id="menu-calendar" to="/calendario" className={({
                isActive
              }) => `flex items-center px-4 py-2 rounded-md ${isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'}`}>
                  <CalendarIcon className="w-5 h-5 mr-3" />
                  Calendário
                </NavLink>
              </li>
              {/*    
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
              */}
              <li>
                <NavLink id="menu-monthly-report" to="/relatorio-mensal" className={({
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
    </aside>;
};