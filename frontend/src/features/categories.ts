import {
  Baby,
  BadgeDollarSign,
  Book,
  Briefcase,
  Car,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  House,
  Landmark,
  PawPrint,
  PiggyBank,
  Plane,
  Play,
  Receipt,
  Repeat,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "../types/FinanceTypes";

/**
 * Ícone da categoria. Até o campo `icon` existir (Fase 3b), é deduzido do nome;
 * depois esta função vira o valor padrão de categorias sem ícone salvo.
 */
const rules: Array<[RegExp, LucideIcon]> = [
  [/aliment|comida|restaur|padaria|lanche|refei|ifood|delivery/i, Utensils],
  [/mercad|supermerc/i, ShoppingCart],
  [/morad|aluguel|casa|condom|lar\b/i, House],
  [/transp|combust|gasolina|uber|carro|ve[ií]culo|estacion|ônibus|onibus/i, Car],
  [/lazer|divers|cinema|entreten|jogo|show/i, Play],
  [/sa[uú]de|farm[aá]c|m[eé]dic|hospital|plano/i, Heart],
  [/academ|esporte|fitness/i, Dumbbell],
  [/assinat|streaming|servi[cç]o/i, Repeat],
  [/educa|curso|escola|faculd/i, GraduationCap],
  [/livro|leitura/i, Book],
  [/viage|f[eé]rias|turismo/i, Plane],
  [/roupa|vestu|moda/i, Shirt],
  [/compra|shopping/i, ShoppingBag],
  [/pet|animal|cachorro|gato/i, PawPrint],
  [/filho|crian|beb[eê]/i, Baby],
  [/presente|doa[cç]/i, Gift],
  [/internet|telefon|celular/i, Wifi],
  [/luz|energia|[aá]gua|conta/i, Zap],
  [/beleza|cuidado|est[eé]tica/i, Sparkles],
  [/eletr[oô]n|tecnolog/i, Smartphone],
  [/imposto|taxa|tarifa|banco/i, Landmark],
  [/sal[aá]rio|trabalho|freela/i, Briefcase],
  [/invest|rendimento|dividend/i, TrendingUp],
  [/poupan|reserva|guard/i, PiggyBank],
  [/cashback|reembolso|b[oô]nus|extra/i, BadgeDollarSign],
  [/receita|renda|entrada/i, Wallet],
];

export function categoryIcon(name?: string | null): LucideIcon {
  if (!name) return Tag;
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? Receipt;
}

const tones = ["chart-1", "chart-3", "chart-2", "chart-4", "chart-5", "chart-6"] as const;

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
};

/** Cor da categoria vinda da paleta do design (a cor escolhida no app antigo é ignorada). */
export const categoryColorVar = (category?: Pick<Category, "id"> | null) =>
  category ? `var(--${tones[hash(category.id) % tones.length]})` : "var(--muted-2)";

/** Cor do n-ésimo item de um gráfico (ordem de valor). */
export const chartColorVar = (index: number) => `var(--chart-${(index % 6) + 1})`;

export type CategoryLookup = (id: string | null | undefined) => Category | undefined;

export const makeCategoryLookup = (categories: Category[] = []): CategoryLookup => {
  const map = new Map(categories.map((category) => [category.id, category]));
  return (id) => (id ? map.get(id) : undefined);
};
