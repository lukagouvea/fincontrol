import { prisma } from './prisma.js';

/**
 * Confere se a categoria é do usuário (e do tipo certo, quando informado).
 * Vazio/ausente é aceito: a validação de obrigatoriedade fica no schema.
 */
export async function isOwnCategory(userId: string, categoryId: string | null | undefined, type?: string) {
  if (!categoryId) return true;
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId, ...(type && { type }) },
    select: { id: true },
  });
  return !!category;
}

export const CATEGORY_NOT_FOUND = { error: 'Categoria não encontrada' };
