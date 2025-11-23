import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../services/categoryService';
import { Category } from '../types/FinanceTypes';

// Chave única para o cache
const CACHE_KEY = ['categories'];

// 1. Hook para BUSCAR dados (GET)
export const useCategories = () => {
  return useQuery({
    queryKey: CACHE_KEY,
    queryFn: categoryService.getAll,
    staleTime: 1000 * 60 * 5, // Dados considerados "frescos" por 5 minutos
  });
};

// 2. Hook para CRIAR dados (POST)
export const useAddCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryService.create,
    onSuccess: () => {
      // O pulo do gato: Invalida o cache para forçar uma nova busca automática
      queryClient.invalidateQueries({ queryKey: CACHE_KEY });
    },
  });
};

// 3. Hook para EDITAR dados (PUT/PATCH)
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) => 
      categoryService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY });
    },
  });
};

// 4. Hook para DELETAR dados (DELETE)
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: categoryService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CACHE_KEY });
    },
  });
};