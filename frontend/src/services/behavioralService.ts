import { api } from './api';

export interface BehavioralAnalysisResponse {
  fullText: string;
  transactionCount: number;
  periodDays: number;
}

export interface InterpretSimulationPayload {
  meta: number;
  prazo: number;
  sobra: number;
  desvio: number;
  prob: number;
  mediana: number;
  p90: number;
  p10: number;
  mesMediana: number | null;
  extraNecessario: number;
  extra?: number;
  probExtra?: number;
}

export const behavioralService = {
  analyze: async (): Promise<BehavioralAnalysisResponse> => {
    const { data } = await api.post<BehavioralAnalysisResponse>('/behavioral/analyze');
    return data;
  },

  interpretSimulation: async (payload: InterpretSimulationPayload): Promise<string> => {
    const { data } = await api.post<{ text: string }>('/behavioral/interpret-simulation', payload);
    return data.text;
  },
};
