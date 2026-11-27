import {
  Baby,
  BadgeDollarSign,
  Book,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Gift,
  GraduationCap,
  Heart,
  House,
  Landmark,
  Music,
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
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "../types/FinanceTypes";

/** Ícones disponíveis para categorias (chave salva no banco → ícone e nome acessível). */
export const CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  utensils: { icon: Utensils, label: "Refeição" },
  "shopping-cart": { icon: ShoppingCart, label: "Mercado" },
  house: { icon: House, label: "Casa" },
  car: { icon: Car, label: "Carro" },
  play: { icon: Play, label: "Lazer" },
  heart: { icon: Heart, label: "Coração" },
  dumbbell: { icon: Dumbbell, label: "Academia" },
  repeat: { icon: Repeat, label: "Assinatura" },
  "graduation-cap": { icon: GraduationCap, label: "Educação" },
  book: { icon: Book, label: "Livro" },
  plane: { icon: Plane, label: "Viagem" },
  shirt: { icon: Shirt, label: "Roupas" },
  "shopping-bag": { icon: ShoppingBag, label: "Compras" },
  "paw-print": { icon: PawPrint, label: "Pata" },
  baby: { icon: Baby, label: "Bebê" },
  gift: { icon: Gift, label: "Presente" },
  wifi: { icon: Wifi, label: "Internet" },
  zap: { icon: Zap, label: "Energia" },
  sparkles: { icon: Sparkles, label: "Beleza" },
  smartphone: { icon: Smartphone, label: "Celular" },
  coffee: { icon: Coffee, label: "Café" },
  music: { icon: Music, label: "Música" },
  wrench: { icon: Wrench, label: "Ferramenta" },
  landmark: { icon: Landmark, label: "Banco" },
  briefcase: { icon: Briefcase, label: "Trabalho" },
  "trending-up": { icon: TrendingUp, label: "Investimento" },
  "piggy-bank": { icon: PiggyBank, label: "Poupança" },
  "badge-dollar-sign": { icon: BadgeDollarSign, label: "Extra" },
  wallet: { icon: Wallet, label: "Carteira" },
  receipt: { icon: Receipt, label: "Conta" },
  tag: { icon: Tag, label: "Etiqueta" },
};

/**
 * Ícone sugerido pelo nome. É o padrão de categorias sem ícone salvo e a
 * sugestão inicial ao criar uma categoria.
 */
const rules: Array<[RegExp, string]> = [
  [/aliment|comida|restaur|padaria|lanche|refei|ifood|delivery/i, "utensils"],
  [/mercad|supermerc/i, "shopping-cart"],
  [/morad|aluguel|\bcasa\b|condom|\blar\b/i, "house"],
  [/transp|combust|gasolina|posto|uber|99 ?pop|carro|ve[ií]culo|estacion|ped[aá]gio|ônibus|onibus/i, "car"],
  [/lazer|divers|cinema|entreten|jogo|show/i, "play"],
  [/sa[uú]de|farm[aá]c|m[eé]dic|hospital|plano/i, "heart"],
  [/academ|esporte|fitness/i, "dumbbell"],
  [/assinat|streaming|servi[cç]o/i, "repeat"],
  [/educa|curso|escola|faculd/i, "graduation-cap"],
  [/livro|leitura/i, "book"],
  [/viage|f[eé]rias|turismo/i, "plane"],
  [/roupa|vestu|moda/i, "shirt"],
  [/compra|shopping/i, "shopping-bag"],
  [/pet|animal|cachorro|gato/i, "paw-print"],
  [/filho|crian|beb[eê]/i, "baby"],
  [/presente|doa[cç]/i, "gift"],
  [/internet|telefon|celular/i, "wifi"],
  [/luz|energia|[aá]gua|conta/i, "zap"],
  [/beleza|cuidado|est[eé]tica/i, "sparkles"],
  [/eletr[oô]n|tecnolog/i, "smartphone"],
  [/caf[eé]/i, "coffee"],
  [/m[uú]sica/i, "music"],
  [/manuten|reparo|conserto/i, "wrench"],
  [/imposto|taxa|tarifa|banco/i, "landmark"],
  [/sal[aá]rio|trabalho|freela/i, "briefcase"],
  [/invest|rendimento|dividend/i, "trending-up"],
  [/poupan|reserva|guard/i, "piggy-bank"],
  [/cashback|reembolso|b[oô]nus|extra/i, "badge-dollar-sign"],
  [/receita|renda|entrada/i, "wallet"],
];

export function guessIconKey(name?: string | null): string {
  if (!name?.trim()) return "tag";
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? "receipt";
}

/** Chave efetiva: a salva (se válida) ou a deduzida do nome. */
export const categoryIconKey = (category?: Pick<Category, "name" | "icon"> | null) =>
  category?.icon && CATEGORY_ICONS[category.icon] ? category.icon : guessIconKey(category?.name);

export function categoryIcon(category?: Pick<Category, "name" | "icon"> | null): LucideIcon {
  if (!category) return Tag;
  return CATEGORY_ICONS[categoryIconKey(category)].icon;
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
