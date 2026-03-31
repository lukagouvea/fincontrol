import { api } from './api';

export interface TutorialStatus {
  tutorialCompleted: boolean;
}

export interface UpdateTutorialStatusRequest {
  tutorialCompleted: boolean;
}

export const tutorialService = {
  /**
   * Busca o status do tutorial do usuário logado
   */
  getTutorialStatus: async (): Promise<TutorialStatus> => {
    const { data } = await api.get<TutorialStatus>('/users/tutorial-status');
    return data;
  },

  /**
   * Atualiza o status de conclusão do tutorial
   */
  updateTutorialStatus: async (completed: boolean): Promise<void> => {
    await api.patch('/users/tutorial-status', {
      tutorialCompleted: completed,
    });
  },
};
