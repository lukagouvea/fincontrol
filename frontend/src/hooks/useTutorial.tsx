import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { driver, DriveStep, Config } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tutorialService } from '../services/tutorialService';

/**
 * Hook customizado para gerenciar o tutorial guiado usando Driver.js
 * 
 * Funcionalidades:
 * - Busca o status do tutorial via React Query
 * - Configura a instância do Driver.js com passos em português
 * - Controla auto-início baseado no status do usuário
 * - Persiste conclusão no backend
 */
export const useTutorial = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const driverInstance = useRef<ReturnType<typeof driver> | null>(null);

  // ==========================================
  // React Query: Buscar Status do Tutorial
  // ==========================================
  const { data: tutorialStatus, isLoading } = useQuery({
    queryKey: ['tutorialStatus'],
    queryFn: tutorialService.getTutorialStatus,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    retry: 1,
  });

  // ==========================================
  // React Query: Mutation para Marcar como Concluído
  // ==========================================
  const { mutate: markAsCompleted } = useMutation({
    mutationFn: (completed: boolean) => tutorialService.updateTutorialStatus(completed),
    onSuccess: () => {
      // Invalida a query para atualizar o cache
      queryClient.invalidateQueries({ queryKey: ['tutorialStatus'] });
    },
    onError: (error) => {
      console.error('Erro ao atualizar status do tutorial:', error);
    },
  });

  // ==========================================
  // Definição dos Passos do Tutorial
  // ==========================================
  const tutorialSteps: DriveStep[] = [
    {
      popover: {
        title: '🎉 Bem-vindo ao FinControl!',
        description: 
          'Vamos fazer um tour rápido pelas principais funcionalidades. ' +
          'Você pode pular este tutorial a qualquer momento clicando em "Pular Tutorial".',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#dashboard-overview',
      popover: {
        title: '📊 Dashboard Financeiro',
        description: 
          'Seu painel de controle principal. Aqui você tem acesso rápido ao saldo atual, ' +
          'resumo do mês e indicadores vitais para sua saúde financeira.',
        side: 'bottom',
      },
    },
    {
      element: '#btn-add-transaction',
      popover: {
        title: '+ Adicionar Transação',
        description: 
          'Botão de ação rápida para registrar receitas ou despesas. ' +
          'Mantenha seus registros sempre atualizados para um controle preciso.',
        side: 'left',
      },
    },
    {
      element: '#menu-categories',
      popover: {
        title: '🏷️ Categorias',
        description: 
          'Organize seus lançamentos por categorias. ' +
          'Isso é fundamental para gerar relatórios precisos sobre seus hábitos de consumo. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'], // Remove botões de navegação
        onNextClick: (element) => {
          // Simula o clique no elemento
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#category-container',
      popover: {
        title: '🏷️ Gerenciamento de Categorias',
        description: 
          'Crie e edite as categorias que fazem sentido para sua realidade. ' +
          'Uma boa categorização é a base de um bom planejamento financeiro.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#menu-fixed-income',
      popover: {
        title: '💵 Rendas Fixas',
        description: 
          'Cadastre suas receitas recorrentes (como salários e aluguéis). ' +
          'O sistema lançará esses valores automaticamente todos os meses, facilitando seu planejamento. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'], // Remove botões de navegação
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#fixed-income-container',
      popover: {
        title: '💵 Gerenciamento de Rendas Fixas',
        description: 
          'Defina aqui tudo que entra com regularidade mensal. ' +
          'Isso compõe a base da sua previsão orçamentária.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#menu-variable-income',
      popover: {
        title: '� Rendas Variáveis',
        description: 
          'Registre receitas eventuais (bônus, freelances, vendas). ' +
          'Valores que entram, mas não são fixos no seu orçamento mensal. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'],
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#variable-income-container',
      popover: {
        title: '💸 Gerenciamento de Rendas Variáveis',
        description: 
          'Controle aqui suas entradas extras. ' +
          'Importante para separar o que é garantido do que é eventual.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#menu-fixed-expenses',
      popover: {
        title: '💳 Despesas Fixas',
        description: 
          'Registre suas contas obrigatórias (aluguel, internet, assinaturas). ' +
          'Tenha visibilidade clara do seu Custo de Vida mensal. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'],
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#fixed-expenses-container',
      popover: {
        title: '💳 Gerenciamento de Despesas Fixas',
        description: 
          'Mantenha suas contas fixas atualizadas. ' +
          'O sistema usará esses valores para calcular quanto do seu dinheiro já está comprometido.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#menu-variable-expenses',
      popover: {
        title: '🛒 Despesas Variáveis',
        description: 
          'Controle os gastos do dia a dia (mercado, lazer, transporte). ' +
          'Aqui é onde o controle financeiro faz mais diferença. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'],
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#variable-expenses-container',
      popover: {
        title: '🛒 Gerenciamento de Despesas Variáveis',
        description: 
          'Visualize e gerencie seus gastos variáveis. ' +
          'Identifique onde é possível economizar.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#menu-calendar',
      popover: {
        title: '📅 Calendário Financeiro',
        description: 
          'Uma visão cronológica das suas movimentações. ' +
          'Ideal para ver vencimentos e planejar o fluxo de caixa da semana. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'], // Remove botões de navegação
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#calendar-container',
      popover: {
        title: '📅 Página do Calendário',
        description: 
          'Acompanhe dia a dia suas receitas e despesas. ' +
          'Evite surpresas com datas de vencimento.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#menu-monthly-report',
      popover: {
        title: '📊 Relatórios',
        description: 
          'Analise a evolução do seu patrimônio e padrões de consumo ' +
          'através de gráficos detalhados. ' +
          '👉 Clique neste menu para continuar!',
        side: 'right',
        showButtons: ['close'],
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#monthly-report-container',
      popover: {
        title: '📊 Página do Relatório Mensal',
        description: 
          'Mergulhe nos dados do seu mês. ' +
          'Compare categorias, acompanhe saldos e visualize para onde seu dinheiro foi.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#user-menu-button',
      popover: {
        title: '⚙️ Configurações',
        description: 
          'Acesse seu perfil, preferências de tema e definições de investimentos. ' +
          '👉 Clique para abrir o menu!',
        side: 'left',
        showButtons: ['close'], // Remove botões de navegação
        onNextClick: (element) => {
          (element as HTMLElement | null)?.click();
        },
      },
    },
    {
      element: '#theme-toggle',
      popover: {
        title: '🌓 Aparência',
        description: 
          'Escolha entre tema Claro ou Escuro para sua melhor experiência de uso.',
        side: 'left',
      },
    },
    {
      element: '#investment-setting',
      popover: {
        title: '💰 Meta de Investimento',
        description: 
          'Defina quanto quer poupar por mês. ' +
          'Este valor será "reservado" do seu saldo disponível, ajudando você a priorizar seu futuro antes de gastar com supérfluos.',
        side: 'bottom',
      },
    },
    {
      element: '#monthly-report-management-card',
      popover: {
        title: '📈 Monitor de Orçamento',
        description: 
          'Este card é o coração do seu planejamento mensal. ' +
          'Ele mostra o quanto sobra da sua renda após descontar contas fixas e investimentos. ' +
          'Verde indica que você está dentro do planejado. Use este valor como limite para seus gastos variáveis.',
        side: 'left',
      },
    },
    {
      popover: {
        title: '✅ Tutorial Concluído!',
        description: 
          'Você está pronto para começar a controlar suas finanças! ' +
          'Se precisar ver este tutorial novamente, vá até o menu de configurações ' +
          '(seu nome no canto superior direito) e clique em "Ver Tutorial Novamente".',
        side: 'bottom',
        align: 'center',
      },
    },
  ];

  // ==========================================
  // Configuração do Driver.js
  // ==========================================
  const driverConfig: Config = {
    showProgress: true, // Mostra progresso (1/8, 2/8, etc)
    showButtons: ['next', 'previous', 'close'], // Botões de navegação
    nextBtnText: 'Próximo →',
    prevBtnText: '← Anterior',
    doneBtnText: 'Concluir ✓',
    progressText: '{{current}} de {{total}}',
    
    // Callbacks importantes
    onDestroyed: () => {
      // Chamado quando o tutorial é finalizado (concluído ou pulado)
      markAsCompleted(true);
    },
    
    onDestroyStarted: () => {
      // Permite destruir o driver em qualquer momento
      if (driverInstance.current) {
        driverInstance.current.destroy();
      }
    },

    onHighlightStarted: (element) => {
      // Scroll para o elemento antes de destacar
      if (element) {
        (element as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Adiciona listeners de clique para elementos interativos da sidebar e menu
        const elementId = element.id;

        // IDs correspondentes aos NavLinks na sidebar
        const clickableIds = [
          'menu-categories',
          'menu-fixed-income',
          'menu-variable-income',
          'menu-fixed-expenses',
          'menu-variable-expenses',
          'menu-calendar',
          'menu-monthly-report',
          'user-menu-button',
        ];

        if (elementId && clickableIds.includes(elementId)) {
          const el = element as HTMLElement;

          const handleElementClick = () => {
            // Remove o listener após o clique
            el.removeEventListener('click', handleElementClick);

            // Pequeno delay para permitir a navegação/abertura do menu
            setTimeout(() => {
              if (driverInstance.current) {
                try {
                  driverInstance.current.moveNext();
                } catch (e) {
                  // ignore
                }
              }
            }, 300);
          };

          // Adiciona o listener de clique
          el.addEventListener('click', handleElementClick, { once: true });
        }
      }
    },

    // Configurações de animação e estilo
    animate: true,
    smoothScroll: true,
    
    // Permitir clique fora para fechar (útil para UX)
    allowClose: true,
    
    // Configuração de destaque
    stagePadding: 10,
    stageRadius: 5,
    
    // Desabilita clique no overlay para evitar fechar acidentalmente
    disableActiveInteraction: false,
    
    // Classes CSS personalizadas (opcional - você pode customizar)
    popoverClass: 'fincontrol-tutorial-popover',
    
    // Steps
    steps: tutorialSteps,
  };

  // ==========================================
  // Inicializa a instância do Driver.js
  // ==========================================
  useEffect(() => {
    if (!driverInstance.current) {
      driverInstance.current = driver(driverConfig);
    }

    return () => {
      // Cleanup: destrói a instância ao desmontar
      if (driverInstance.current) {
        driverInstance.current.destroy();
        driverInstance.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // Função para Iniciar o Tutorial (Exportada)
  // ==========================================
  const startTutorial = useCallback(() => {
    if (driverInstance.current) {
      // Navigate to dashboard first
      navigate('/');
      
      // Força scroll para o topo antes de iniciar
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Aguarda um momento para garantir que o scroll e navegação aconteceram
      setTimeout(() => {
        if (driverInstance.current) {
          driverInstance.current.drive();
        }
      }, 300);
    }
  }, [navigate]);

  // ==========================================
  // Auto-início do Tutorial
  // ==========================================
  useEffect(() => {
    // Só inicia automaticamente se:
    // 1. Não está carregando
    // 2. Status existe
    // 3. Tutorial não foi completado
    // 4. Driver está inicializado
    if (
      !isLoading &&
      tutorialStatus &&
      !tutorialStatus.tutorialCompleted &&
      driverInstance.current
    ) {
      // Delay de 1500ms para garantir que o DOM está completamente pronto
      const timer = setTimeout(() => {
        startTutorial();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isLoading, tutorialStatus, startTutorial]);

  return {
    /**
     * Inicia o tutorial manualmente (usado no botão "Ver Tutorial Novamente")
     */
    startTutorial,
    
    /**
     * Status de conclusão do tutorial
     */
    tutorialCompleted: tutorialStatus?.tutorialCompleted ?? true,
    
    /**
     * Indica se está carregando o status
     */
    isLoading,
  };
};
