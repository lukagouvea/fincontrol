import { api } from './api';

export interface BehavioralAnalysisResponse {
  fullText: string;
  transactionCount: number;
  periodDays: number;
}

export const behavioralService = {
  analyze: async (): Promise<BehavioralAnalysisResponse> => {
    const { data } = await api.post<BehavioralAnalysisResponse>('/behavioral/analyze');
    return data;
  },
};
