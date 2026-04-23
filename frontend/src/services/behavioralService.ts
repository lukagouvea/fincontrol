import { api } from './api';

export type BiasSeverity = 'alta' | 'media' | 'baixa';

export interface BehavioralBias {
  nome: string;
  descricao: string;
  evidencias: string[];
  severidade: BiasSeverity;
  recomendacao: string;
}

export interface BehavioralInsights {
  perfil: string;
  gatilho_principal: string;
  vieses: BehavioralBias[];
}

export interface BehavioralAnalysisStructuredResponse {
  thinking: string;
  insights: BehavioralInsights;
  transactionCount: number;
  periodDays: number;
  model?: string;
  fullText?: string;
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

export interface InterpretSimulationResponse {
  text: string;
  model?: string;
}

const analyzeStructured = async (): Promise<BehavioralAnalysisStructuredResponse> => {
  const { data } = await api.post<BehavioralAnalysisStructuredResponse>('/behavioral/analyze');
  return data;
};

const interpretSimulationStructured = async (
  payload: InterpretSimulationPayload,
): Promise<InterpretSimulationResponse> => {
  const { data } = await api.post<InterpretSimulationResponse>('/simulation/interpret', payload);
  return data;
};

export const behavioralAnalysisApi = {
  analyzeStructured,
};

export const simulationInterpretationApi = {
  interpretStructured: interpretSimulationStructured,
};
