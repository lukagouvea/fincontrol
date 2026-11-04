import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { driver } from "driver.js";
import { tutorialService } from "../services/tutorialService";

const TutorialContext = createContext({
  startTutorial: () => {},
  tutorialCompleted: true,
  isLoading: false,
});
export function TutorialProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const active = useRef<ReturnType<typeof driver> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const started = useRef(false);
  const status = useQuery({
    queryKey: ["tutorialStatus"],
    queryFn: tutorialService.getTutorialStatus,
    staleTime: 300000,
    retry: 1,
  });
  const complete = useMutation({
    mutationFn: () => tutorialService.updateTutorialStatus(true),
    onSuccess: () => client.invalidateQueries({ queryKey: ["tutorialStatus"] }),
  });
  const completeRef = useRef(complete.mutate);
  completeRef.current = complete.mutate;
  const startTutorial = useCallback(() => {
    navigate("/");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      active.current?.destroy();
      const mobile = window.matchMedia("(max-width: 1023px)").matches;
      const steps = [
        {
          element: "#dashboard-overview",
          popover: {
            title: "Início",
            description:
              "O início reúne saldo, orçamento planejado e compromissos do mês.",
          },
        },
        {
          element: "#budget-overview",
          popover: {
            title: "Saldo e planejamento",
            description:
              "Saldo é a diferença entre receitas e despesas. O orçamento planejado reserva compromissos e investimento antes das despesas variáveis.",
          },
        },
        {
          element: "#quick-add",
          popover: {
            title: "Registre uma movimentação",
            description:
              "Use Novo lançamento para adicionar uma despesa ou receita rapidamente.",
          },
        },
        {
          element: mobile ? "#mobile-navigation" : "#desktop-navigation",
          popover: {
            title: "Tudo ao seu alcance",
            description:
              "Lançamentos reúne receitas e despesas fixas e variáveis. No calendário você acompanha cada dia. Relatórios e Categorias também ficam acessíveis pelo menu Mais no celular.",
          },
        },
        {
          element: "#header-account-button",
          popover: {
            title: "Conta e preferências",
            description:
              "Defina seu investimento mensal, alterne o tema ou reveja este tutorial pela sua conta.",
          },
        },
      ].filter((step) => document.querySelector(step.element));
      const instance = driver({
        steps,
        showProgress: true,
        nextBtnText: "Próximo",
        prevBtnText: "Anterior",
        doneBtnText: "Concluir",
        progressText: "{{current}} de {{total}}",
        stagePadding: 6,
        stageRadius: 8,
        animate: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        onDestroyed: () => {
          active.current = null;
          completeRef.current();
        },
      });
      active.current = instance;
      instance.drive();
    }, 200);
  }, [navigate]);
  useEffect(() => {
    if (status.data && !status.data.tutorialCompleted && !started.current) {
      started.current = true;
      timer.current = setTimeout(startTutorial, 1200);
    }
    return () => clearTimeout(timer.current);
  }, [status.data, startTutorial]);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (active.current) {
        active.current.setConfig({ onDestroyed: () => {} });
        active.current.destroy();
      }
    },
    [],
  );
  return (
    <TutorialContext.Provider
      value={{
        startTutorial,
        tutorialCompleted: status.data?.tutorialCompleted ?? true,
        isLoading: status.isLoading,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}
export const useTutorial = () => useContext(TutorialContext);
