// src/components/Dashboard/BehavioralAgent.tsx
import React, { useState, useRef, useCallback } from 'react';
import { BrainCircuit, Sparkles, RotateCcw, AlertTriangle, TrendingUp } from 'lucide-react';
import { behavioralService } from '../../services/behavioralService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BiasSeverity {
  label: string;
  bgLight: string;
  bgDark: string;
  textLight: string;
  textDark: string;
  borderLight: string;
  borderDark: string;
  dot: string;
}

interface Bias {
  nome: string;
  descricao: string;
  evidencias: string[];
  severidade: 'alta' | 'media' | 'baixa';
  recomendacao: string;
}

interface Insights {
  perfil: string;
  gatilho_principal: string;
  vieses: Bias[];
}

type Phase = 'idle' | 'loading' | 'thinking' | 'done' | 'error';

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV: Record<string, BiasSeverity> = {
  alta: {
    label: 'Alta',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-950/40',
    textLight: 'text-red-800',
    textDark: 'dark:text-red-300',
    borderLight: 'border-red-200',
    borderDark: 'dark:border-red-800/60',
    dot: 'bg-red-500',
  },
  media: {
    label: 'Média',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/30',
    textLight: 'text-amber-800',
    textDark: 'dark:text-amber-300',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-700/50',
    dot: 'bg-amber-500',
  },
  baixa: {
    label: 'Baixa',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/30',
    textLight: 'text-emerald-800',
    textDark: 'dark:text-emerald-300',
    borderLight: 'border-emerald-200',
    borderDark: 'dark:border-emerald-800/50',
    dot: 'bg-emerald-500',
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const PulsingDots: React.FC = () => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

const BiasCard: React.FC<{ bias: Bias; index: number }> = ({ bias, index }) => {
  const s = SEV[bias.severidade] ?? SEV.media;

  return (
    <div
      className={`
        rounded-xl border overflow-hidden
        ${s.borderLight} ${s.borderDark}
        transition-all duration-300
      `}
      style={{
        animationDelay: `${index * 120}ms`,
        animation: 'fadeSlideUp 0.4s ease both',
      }}
    >
      {/* Card header */}
      <div className={`px-4 py-2.5 flex items-center justify-between ${s.bgLight} ${s.bgDark}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${s.dot}`} />
          <span className={`text-sm font-semibold ${s.textLight} ${s.textDark}`}>
            {bias.nome}
          </span>
        </div>
        <span
          className={`
            text-xs px-2 py-0.5 rounded-full font-medium
            ${s.textLight} ${s.textDark} 
            bg-white/60 dark:bg-black/20
            border ${s.borderLight} ${s.borderDark}
          `}
        >
          {s.label}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3 bg-white dark:bg-gray-800/50">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {bias.descricao}
        </p>

        {/* Evidence chips */}
        {bias.evidencias?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bias.evidencias.map((e, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
              >
                {e}
              </span>
            ))}
          </div>
        )}

        {/* Recommendation */}
        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Recomendação
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mt-0.5">
                {bias.recomendacao}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const BehavioralAgent: React.FC = () => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [thinkText, setThinkText] = useState('');
  const [insights, setInsights] = useState<Insights | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setThinkText('');
    setInsights(null);
    setErrorMessage('');
  }, [clearTimer]);

  const analyze = useCallback(async () => {
    clearTimer();
    setPhase('loading');
    setThinkText('');
    setInsights(null);
    setErrorMessage('');

    try {
      const result = await behavioralService.analyze();
      setTransactionCount(result.transactionCount);
      const fullText = result.fullText;

      // Split thinking from JSON block
      const jStart = fullText.indexOf('<json>');
      const thinkingPart = jStart > -1 ? fullText.slice(0, jStart).trim() : fullText;
      const rawJson =
        jStart > -1 ? fullText.slice(jStart + 6, fullText.indexOf('</json>')).trim() : '';

      setPhase('thinking');

      // Typewriter effect
      let i = 0;
      timerRef.current = setInterval(() => {
        i = Math.min(i + 6, thinkingPart.length);
        setThinkText(thinkingPart.slice(0, i));

        // Auto-scroll thinking panel
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }

        if (i >= thinkingPart.length) {
          clearTimer();
          if (!rawJson) {
            setPhase('error');
            setErrorMessage('O agente não retornou a análise estruturada. Tente novamente.');
            return;
          }
          try {
            const parsed = JSON.parse(rawJson) as Insights;
            setInsights(parsed);
            setTimeout(() => setPhase('done'), 300);
          } catch {
            setPhase('error');
            setErrorMessage('Erro ao interpretar os insights. Tente novamente.');
          }
        }
      }, 14);
    } catch (err: unknown) {
      clearTimer();
      setPhase('error');
      const apiErr = err as { response?: { data?: { error?: string } } };
      setErrorMessage(
        apiErr?.response?.data?.error ??
          'Erro ao conectar ao servidor. Verifique se o backend está rodando.',
      );
    }
  }, [clearTimer]);

  const isRunning = phase === 'loading' || phase === 'thinking';

  return (
    <>
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>

      <div className="flex flex-col h-full gap-4">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
              <BrainCircuit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Análise dos últimos 90 dias de despesas
              </p>
            </div>
          </div>

          {/* Action button */}
          <button
            disabled={isRunning}
            onClick={phase === 'done' || phase === 'error' ? reset : analyze}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 flex-shrink-0
              ${
                isRunning
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : phase === 'done' || phase === 'error'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }
            `}
          >
            {isRunning ? (
              <>
                <PulsingDots />
                <span>Analisando...</span>
              </>
            ) : phase === 'done' || phase === 'error' ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova análise</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Analisar padrões</span>
              </>
            )}
          </button>
        </div>

        {/* ── Content area ── */}
        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Idle state */}
          {phase === 'idle' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
                <BrainCircuit className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Agente pronto para analisar
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Detecta vieses em behavioral finance com IA
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 animate-pulse">
                <BrainCircuit className="w-6 h-6 text-blue-500 dark:text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Consultando o agente...
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Buscando transações e analisando padrões
                </p>
              </div>
            </div>
          )}

          {/* Thinking / Done state */}
          {(phase === 'thinking' || phase === 'done') && (
            <div className="space-y-4">
              {/* Reasoning panel */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-2 h-2 rounded-full ${phase === 'thinking' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}
                  />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {phase === 'thinking' ? 'Agente raciocina...' : 'Raciocínio concluído'}
                  </span>
                  {phase === 'done' && transactionCount > 0 && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                      {transactionCount} transações analisadas
                    </span>
                  )}
                </div>
                <div
                  ref={scrollRef}
                  className="
                    bg-gray-50 dark:bg-gray-900/60 
                    border border-gray-200 dark:border-gray-700 
                    rounded-xl p-3.5 
                    max-h-36 overflow-y-auto
                    text-xs text-gray-600 dark:text-gray-400 
                    leading-relaxed whitespace-pre-wrap
                    font-mono
                  "
                >
                  {thinkText}
                  {phase === 'thinking' && (
                    <span
                      className="text-blue-500 dark:text-blue-400 text-sm ml-0.5"
                      style={{ animation: 'blink 0.8s infinite' }}
                    >
                      ▌
                    </span>
                  )}
                </div>
              </div>

              {/* Insights */}
              {insights && phase === 'done' && (
                <div className="space-y-3" style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
                  {/* Profile card */}
                  <div className="flex gap-3 p-4 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/30">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50 h-fit">
                      <BrainCircuit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                        Perfil comportamental
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {insights.perfil}
                      </p>
                      {insights.gatilho_principal && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Gatilho principal:{' '}
                          <strong className="text-gray-700 dark:text-gray-300 font-medium">
                            {insights.gatilho_principal}
                          </strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bias cards */}
                  <div className="space-y-2.5">
                    {insights.vieses?.map((bias, i) => (
                      <BiasCard key={i} bias={bias} index={i} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error state */}
          {phase === 'error' && (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-center px-4">
              <div className="p-3 rounded-full bg-red-50 dark:bg-red-950/40">
                <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  Erro na análise
                </p>
                {errorMessage && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                    {errorMessage}
                  </p>
                )}
              </div>
              <button
                onClick={analyze}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
