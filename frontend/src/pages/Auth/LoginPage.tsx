import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState(''); // Novo estado para sucesso
  const [loading, setLoading] = useState(false);
  
  // Novo estado para controlar qual tela mostrar
  const [isRecovering, setIsRecovering] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login({email, password});
      navigate('/');
    } catch (err:any) {
      if (!err.response) {
         setError("Não foi possível conectar ao servidor. Verifique sua conexão.");
      } else if (err.response.status >= 500) {
         setError("Serviço temporariamente indisponível. Tente novamente mais tarde.");
      } else if (err.response.status === 429) {
         setError("Muitas tentativas seguidas. Aguarde um momento.");
      } else if (err.response.status === 401) {
         setError("E-mail ou senha incorretos.");
      } else {
         setError("Ocorreu um erro inesperado. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Função para enviar o e-mail de recuperação
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor, informe seu e-mail.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      // Tenta chamar o endpoint padrão de recuperação
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        if (response.status === 404) throw new Error("E-mail não encontrado.");
        throw new Error("Erro ao enviar e-mail. Tente novamente.");
      }

      setSuccessMessage('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error(err);
      // Se der erro 404 (rota não existe no backend), avisamos de forma amigável
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
         setError("Erro de conexão com o servidor.");
      } else {
         setError(err.message || "Não foi possível enviar a solicitação.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsRecovering(true);
    setError('');
    setSuccessMessage('');
  };

  const handleBackToLogin = () => {
    setIsRecovering(false);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-blue-600">
          FinControl
        </h1>
        <h2 className="mt-2 text-center text-2xl font-bold text-gray-900">
          {isRecovering ? 'Recuperar Senha' : 'Entre na sua conta'}
        </h2>
        
        {!isRecovering && (
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500">
              crie uma conta
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          
          {/* MENSAGENS DE ERRO E SUCESSO GERAIS */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          {successMessage && (
             <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
               {successMessage}
             </div>
          )}

          {isRecovering ? (
            /* --- FORMULÁRIO DE RECUPERAÇÃO --- */
            <form className="space-y-6" onSubmit={handleRecoverySubmit}>
              <p className="text-sm text-gray-600 mb-4">
                Digite seu e-mail abaixo e enviaremos um link para você redefinir sua senha.
              </p>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail cadastrado
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || !!successMessage}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>
              </div>

              <div className="text-center">
                 <button 
                   type="button" 
                   onClick={handleBackToLogin}
                   className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900"
                 >
                   <ArrowLeft className="w-4 h-4 mr-2" />
                   Voltar para o Login
                 </button>
              </div>
            </form>
          ) : (
            /* --- FORMULÁRIO DE LOGIN ORIGINAL --- */
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  E-mail
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    Lembrar-me
                  </label>
                </div>

                <div className="text-sm">
                  <a 
                    href="#" 
                    onClick={handleForgotPasswordClick}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};