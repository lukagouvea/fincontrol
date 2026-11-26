import {
  ChartNoAxesColumn,
  CreditCard,
  Flag,
  House,
  List,
  PieChart,
  Repeat,
  Settings,
  Tag,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior (mobile). */
  mobile?: boolean;
  /** Divisória antes do item na barra lateral. */
  dividerBefore?: boolean;
};

/** Ordem da barra lateral (desktop) — DESIGN.md › Navegação. */
export const navigation: NavItem[] = [
  { to: "/", label: "Início", icon: House, mobile: true },
  { to: "/transacoes", label: "Transações", icon: List, mobile: true },
  { to: "/cartoes", label: "Cartões", icon: CreditCard, mobile: true },
  { to: "/orcamento", label: "Orçamento", icon: PieChart, mobile: true },
  { to: "/metas", label: "Metas", icon: Flag },
  { to: "/recorrentes", label: "Recorrentes", icon: Repeat },
  { to: "/relatorios", label: "Relatórios", icon: ChartNoAxesColumn, mobile: true },
  { to: "/categorias", label: "Categorias", icon: Tag, dividerBefore: true },
];

export const settingsItem: NavItem = { to: "/ajustes", label: "Ajustes", icon: Settings };
