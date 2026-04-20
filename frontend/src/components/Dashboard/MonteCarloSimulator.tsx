// src/components/Dashboard/MonteCarloSimulator.tsx
// Monte Carlo financial goal simulator using Canvas API
// Uses real historical savings data (income - expenses per month)
// AI interpretation goes through backend Groq proxy

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Target, TrendingUp, Sparkles, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { behavioralService } from '../../services/behavioralService';
import { Transaction, FixedIncome, FixedExpense, MonthlyVariation } from '../../types/FinanceTypes';
import { parseDateInputToLocal } from '../../utils/dateUtils';
import { isItemActiveInMonth, getActualFixedItemAmount } from '../../utils/financeUtils';

// ─── Config ────────────────────────────────────────────────────────────────────
const N_SIM = 1000;

// ─── Math utilities ────────────────────────────────────────────────────────────
function randn(): number {
  let u: number, v: number;
  do { u = Math.random(); } while (!u);
  do { v = Math.random(); } while (!v);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function simulate(mu: number, std: number, prazo: number): number[][] {
  return Array.from({ length: N_SIM }, () => {
    let acc = 0;
    return [0, ...Array.from({ length: prazo }, () => {
      acc += mu + randn() * std;
      return acc;
    })];
  });
}

interface Percentiles { p10: number; p25: number; p50: number; p75: number; p90: number }

function getPct(paths: number[][], prazo: number): Percentiles[] {
  return Array.from({ length: prazo + 1 }, (_, m) => {
    const s = [...paths.map(p => p[m])].sort((a, b) => a - b);
    const n = s.length;
    return {
      p10: s[~~(0.10 * n)],
      p25: s[~~(0.25 * n)],
      p50: s[~~(0.50 * n)],
      p75: s[~~(0.75 * n)],
      p90: s[~~(0.90 * n)],
    };
  });
}

function timeToGoal(paths: number[][], goal: number, prazo: number): (number | null)[] {
  return paths.map(p => {
    for (let m = 1; m <= prazo; m++) if (p[m] >= goal) return m;
    return null;
  });
}

// Analytical: extra savings for P(goal) = 80%
// Accumulation ~ Normal(T*mu, sqrt(T)*std) => muReq = (goal + 0.8416*sqrt(T)*std) / T
function requiredFor80(mu: number, std: number, goal: number, prazo: number): number {
  const muReq = (goal + 0.8416 * Math.sqrt(prazo) * std) / prazo;
  return Math.max(0, Math.round((muReq - mu) / 50) * 50);
}

// ─── Compute monthly savings from real transaction data ────────────────────────
export function computeMonthlySavings(
  transactions: Transaction[],
  fixedIncomes: FixedIncome[],
  fixedExpenses: FixedExpense[],
  monthlyVariations: MonthlyVariation[],
  currentDate: Date,
): { mean: number; std: number; months: number } {
  const anoAtual = currentDate.getFullYear();
  const mesAtual = currentDate.getMonth();

  const monthData: number[] = [];

  for (let i = 1; i <= 12; i++) {
    const dateObj = new Date(anoAtual, mesAtual - i, 1);
    const ano = dateObj.getFullYear();
    const mes = dateObj.getMonth();

    // Variable incomes
    const varIncome = transactions.filter(t => {
      const tDate = parseDateInputToLocal(t.date.split('T')[0]);
      return tDate.getMonth() === mes && tDate.getFullYear() === ano &&
        t.type === 'income' && !t.recurringRuleId;
    }).reduce((s, t) => s + Number(t.amount), 0);

    // Fixed incomes
    const fixIncome = fixedIncomes
      .filter(inc => isItemActiveInMonth(inc, dateObj))
      .reduce((s, inc) => s + Number(getActualFixedItemAmount(inc.id, 'income', ano, mes, inc.amount, monthlyVariations)), 0);

    // Variable expenses
    const varExpense = transactions.filter(t => {
      const tDate = parseDateInputToLocal(t.date.split('T')[0]);
      return tDate.getMonth() === mes && tDate.getFullYear() === ano &&
        t.type === 'expense' && !t.recurringRuleId;
    }).reduce((s, t) => s + Number(t.amount), 0);

    // Fixed expenses
    const fixExpense = fixedExpenses
      .filter(exp => isItemActiveInMonth(exp, dateObj))
      .reduce((s, exp) => s + Number(getActualFixedItemAmount(exp.id, 'expense', ano, mes, exp.amount, monthlyVariations)), 0);

    const totalIncome = varIncome + fixIncome;
    const totalExpense = varExpense + fixExpense;

    // Only include months that have data (at least some income or expense)
    if (totalIncome > 0 || totalExpense > 0) {
      monthData.push(totalIncome - totalExpense);
    }
  }

  if (monthData.length === 0) {
    return { mean: 0, std: 0, months: 0 };
  }

  const mean = monthData.reduce((a, b) => a + b, 0) / monthData.length;
  const std = Math.sqrt(
    monthData.reduce((a, b) => a + (b - mean) ** 2, 0) / monthData.length
  );

  return { mean: Math.round(mean), std: Math.round(std), months: monthData.length };
}

// ─── Formatting ────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const fmtK = (v: number) =>
  v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${Math.round(v)}`;

// ─── Canvas: Fan chart ─────────────────────────────────────────────────────────
function drawFan(
  canvas: HTMLCanvasElement,
  pt1: Percentiles[],
  pt2: Percentiles[] | null,
  goal: number,
  prazo: number,
) {
  if (!canvas || !pt1) return;
  const dark = document.documentElement.classList.contains('dark');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 600;
  const H = canvas.offsetHeight || 210;
  if (!W || !H) return;

  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const p = { t: 14, r: 16, b: 28, l: 56 };
  const cW = W - p.l - p.r;
  const cH = H - p.t - p.b;
  const allPts = [...pt1, ...(pt2 || [])];
  const maxY = Math.max(goal * 1.42, Math.max(...allPts.map(x => x.p90)) * 1.1);

  const xS = (m: number) => p.l + (m / prazo) * cW;
  const yS = (v: number) => p.t + cH * (1 - Math.min(Math.max(v, 0), maxY) / maxY);

  ctx.clearRect(0, 0, W, H);

  // Grid
  const gC = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const tC = dark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.36)';
  ctx.font = '10px system-ui';

  for (let i = 0; i <= 4; i++) {
    const y = p.t + (i / 4) * cH;
    const v = maxY * (1 - i / 4);
    ctx.strokeStyle = gC; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(p.l + cW, y); ctx.stroke();
    ctx.fillStyle = tC; ctx.textAlign = 'right';
    ctx.fillText(fmtK(v), p.l - 5, y + 3.5);
  }

  // X axis
  const xSt = prazo <= 12 ? 2 : prazo <= 24 ? 4 : 6;
  ctx.textAlign = 'center';
  for (let m = 0; m <= prazo; m += xSt) {
    ctx.fillStyle = tC;
    ctx.fillText(`M${m}`, xS(m), p.t + cH + 18);
  }

  // Draw scenario band
  const drawSc = (pt: Percentiles[], rgb: string, a1: number, a2: number, lc: string) => {
    // P10-P90 band
    ctx.beginPath();
    pt.forEach((x, m) => m === 0 ? ctx.moveTo(xS(m), yS(x.p10)) : ctx.lineTo(xS(m), yS(x.p10)));
    for (let m = prazo; m >= 0; m--) ctx.lineTo(xS(m), yS(pt[m].p90));
    ctx.closePath(); ctx.fillStyle = `rgba(${rgb},${a1})`; ctx.fill();

    // P25-P75 band
    ctx.beginPath();
    pt.forEach((x, m) => m === 0 ? ctx.moveTo(xS(m), yS(x.p25)) : ctx.lineTo(xS(m), yS(x.p25)));
    for (let m = prazo; m >= 0; m--) ctx.lineTo(xS(m), yS(pt[m].p75));
    ctx.closePath(); ctx.fillStyle = `rgba(${rgb},${a2})`; ctx.fill();

    // Median line
    ctx.beginPath(); ctx.strokeStyle = lc; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    pt.forEach((x, m) => m === 0 ? ctx.moveTo(xS(m), yS(x.p50)) : ctx.lineTo(xS(m), yS(x.p50)));
    ctx.stroke();
  };

  drawSc(pt1, dark ? '29,158,117' : '15,110,86', 0.10, 0.20, '#1D9E75');
  if (pt2) drawSc(pt2, dark ? '127,119,221' : '83,74,183', 0.12, 0.22, '#7F77DD');

  // Goal line
  const gy = yS(goal);
  if (gy >= p.t - 2 && gy <= p.t + cH + 2) {
    ctx.beginPath(); ctx.strokeStyle = '#378ADD'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.moveTo(xS(0), gy); ctx.lineTo(xS(prazo), gy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#378ADD'; ctx.font = '10px system-ui'; ctx.textAlign = 'right';
    ctx.fillText('Meta', p.l + cW, gy - 5);
  }
}

// ─── Interactive Timing Histogram (React DOM, with tooltip) ───────────────────────
interface HistBar {
  month: number | null; // null = never achieved
  count: number;
  pct: number;          // % of simulations
  isMedian: boolean;
}

function buildHistBars(ttg: (number | null)[], prazo: number, nSim: number): HistBar[] {
  const counts = new Array(prazo + 1).fill(0);
  let never = 0;
  ttg.forEach(m => (m === null ? never++ : counts[m]++));

  let cum = 0, medMonth: number | null = null;
  for (let m = 1; m <= prazo; m++) {
    cum += counts[m];
    if (!medMonth && cum >= nSim * 0.5) medMonth = m;
  }

  const bars: HistBar[] = [];
  for (let m = 1; m <= prazo; m++) {
    if (counts[m] > 0) {
      bars.push({ month: m, count: counts[m], pct: Math.round(counts[m] / nSim * 100), isMedian: m === medMonth });
    }
  }
  if (never > 0) {
    bars.push({ month: null, count: never, pct: Math.round(never / nSim * 100), isMedian: false });
  }
  return bars;
}

interface TimingHistogramProps {
  ttg: (number | null)[];
  prazo: number;
}

const TimingHistogram: React.FC<TimingHistogramProps> = ({ ttg, prazo }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; bar: HistBar } | null>(null);

  const bars = useMemo(() => buildHistBars(ttg, prazo, N_SIM), [ttg, prazo]);
  if (!bars.length) return null;

  const maxCount = Math.max(...bars.map(b => b.count), 1);

  return (
    <div className="relative">
      {/* Bars */}
      <div
        className="flex items-end gap-px w-full"
        style={{ height: 72 }}
        onMouseLeave={() => setTooltip(null)}
      >
        {bars.map((bar, i) => {
          const heightPct = (bar.count / maxCount) * 100;
          const isNever = bar.month === null;
          return (
            <div
              key={i}
              className="relative flex-1 flex flex-col items-center justify-end cursor-crosshair group"
              style={{ height: '100%' }}
              onMouseEnter={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parentRect = e.currentTarget.parentElement!.parentElement!.getBoundingClientRect();
                setTooltip({ x: rect.left - parentRect.left + rect.width / 2, y: 0, bar });
              }}
            >
              <div
                className={`w-full rounded-t-sm transition-opacity group-hover:opacity-80 ${isNever
                  ? 'bg-red-400/60 dark:bg-red-500/50'
                  : bar.isMedian
                    ? 'bg-purple-500 dark:bg-purple-400'
                    : 'bg-emerald-500/70 dark:bg-emerald-400/60'
                  }`}
                style={{ height: `${heightPct}%`, minHeight: heightPct > 0 ? 2 : 0 }}
              />
              {/* Month label for every few bars */}
              {(bar.month !== null && (prazo <= 12 || bar.month! % Math.ceil(prazo / 8) === 0)) && (
                <span className="absolute -bottom-4 text-[9px] text-gray-400 dark:text-gray-500 select-none">
                  M{bar.month}
                </span>
              )}
              {isNever && (
                <span className="absolute -bottom-4 text-[9px] text-gray-400 dark:text-gray-500 select-none">∅</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{ left: tooltip.x, top: 0, transform: 'translateX(-50%) translateY(-100%)' }}
        >
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs
                          rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap mb-1">
            {tooltip.bar.month === null ? (
              <>
                <span className="font-semibold">Não atingiu</span>
                <span className="ml-2 text-gray-300 dark:text-gray-600">{tooltip.bar.count} sim · {tooltip.bar.pct}%</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Mês {tooltip.bar.month}</span>
                <span className="ml-2 text-gray-300 dark:text-gray-600">{tooltip.bar.count} sim · {tooltip.bar.pct}%</span>
                {tooltip.bar.isMedian && <span className="ml-1 text-purple-300 dark:text-purple-600"> · mediana</span>}
              </>
            )}
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45 -mt-1.5" />
          </div>
        </div>
      )}

      {/* Bottom labels spacing */}
      <div className="h-5" />

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/70 dark:bg-emerald-400/60" />
          mês em que atingiu
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-purple-500 dark:bg-purple-400" />
          mediana
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-400/60 dark:bg-red-500/50" />
          não atingiu
        </span>
      </div>
    </div>
  );
};


// ─── SVG Probability Gauge (strokeDasharray method — mathematically stable) ────
const ProbGauge: React.FC<{ prob: number }> = ({ prob }) => {
  const r = 30;
  const cx = 44;
  const cy = 44;
  // Half-circle circumference = π * r
  const halfCircum = Math.PI * r; // ≈ 94.25
  const p = Math.min(Math.max(prob, 0), 100) / 100;
  const filled = p * halfCircum;
  // stroke-dasharray: [filled] [huge gap so the rest is invisible]
  const dash = `${filled} ${halfCircum * 2}`;
  const col = prob >= 65 ? '#1D9E75' : prob >= 35 ? '#BA7517' : '#993C1D';

  // The arc goes LEFT to RIGHT (counterclockwise from 180° to 0°, sweep-flag=0)
  const arcD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg width={88} height={56} viewBox="0 0 88 56" overflow="visible">
      {/* Track */}
      <path d={arcD} fill="none" stroke="currentColor"
        className="text-gray-200 dark:text-gray-700"
        strokeWidth={7} strokeLinecap="round" />
      {/* Fill */}
      <path d={arcD} fill="none" stroke={col}
        strokeWidth={7} strokeLinecap="round"
        strokeDasharray={dash}
        strokeDashoffset={0}
        style={{ transition: 'stroke-dasharray 0.35s ease' }} />
      <text x={cx} y={cy - 3} textAnchor="middle" fontSize={19} fontWeight={600} fill={col}>
        {prob}%
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize={9} fill="#9CA3AF">
        sucesso
      </text>
    </svg>
  );
};


// ─── Slider Row ────────────────────────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display?: string;
  onChange: (v: number) => void;
  useNumberInput?: boolean;
  inputPrefix?: string;
  inputSuffix?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({ label, value, min, max, step, display, useNumberInput, inputPrefix, inputSuffix, onChange }) => (
  <div className="mb-2.5">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      {useNumberInput ? (
        <div className="flex items-center gap-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {inputPrefix && <span className="text-gray-500 dark:text-gray-400">{inputPrefix}</span>}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="w-24 px-1.5 py-0.5 text-right bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          {inputSuffix && <span className="text-gray-500 dark:text-gray-400">{inputSuffix}</span>}
        </div>
      ) : (
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{display}</span>
      )}
    </div>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(+e.target.value)}
      onPointerDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                 accent-emerald-600 dark:accent-emerald-500"
    />
  </div>
);

// ─── Types ─────────────────────────────────────────────────────────────────────
interface SimResult {
  basePct: Percentiles[];
  whatIfPct: Percentiles[] | null;
  ttgBase: (number | null)[];
  ttgWhatIf: (number | null)[] | null;
  baseProb: number;
  whatIfProb: number | null;
  reqExtra: number;
  medMonth: number | null;
  finalPt: Percentiles;
  simPrazo: number;
  simGoal: number;
}

type AiPhase = 'idle' | 'loading' | 'typing' | 'done';

export interface MonteCarloSimulatorProps {
  transactions: Transaction[];
  fixedIncomes: FixedIncome[];
  fixedExpenses: FixedExpense[];
  monthlyVariations: MonthlyVariation[];
  date: Date;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export const MonteCarloSimulator: React.FC<MonteCarloSimulatorProps> = ({
  transactions,
  fixedIncomes,
  fixedExpenses,
  monthlyVariations,
  date,
}) => {
  // Compute real savings stats from last 12 months
  const savingsStats = useMemo(
    () => computeMonthlySavings(transactions, fixedIncomes, fixedExpenses, monthlyVariations, date),
    [transactions, fixedIncomes, fixedExpenses, monthlyVariations, date],
  );

  const monthlySavings = savingsStats.mean;
  const savingsStd = Math.max(savingsStats.std, 1); // avoid div/0

  const [goal, setGoal] = useState(20000);
  const [prazo, setPrazo] = useState(18);
  const [extra, setExtra] = useState(0);
  const [showExtra, setShowExtra] = useState(false);
  const [res, setRes] = useState<SimResult | null>(null);
  const [aiPhase, setAiPhase] = useState<AiPhase>('idle');
  const [aiText, setAiText] = useState('');

  const fanRef = useRef<HTMLCanvasElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Run simulation whenever inputs change (debounced to avoid blocking main thread)
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Cancel previous pending simulation
    if (simTimerRef.current) clearTimeout(simTimerRef.current);

    simTimerRef.current = setTimeout(() => {
      const basePaths = simulate(monthlySavings, savingsStd, prazo);
      const basePct = getPct(basePaths, prazo);
      const ttgBase = timeToGoal(basePaths, goal, prazo);
      const baseProb = Math.round(basePaths.filter(p => p[prazo] >= goal).length / N_SIM * 100);

      let whatIfPct: Percentiles[] | null = null;
      let whatIfProb: number | null = null;
      let ttgWhatIf: (number | null)[] | null = null;
      if (extra > 0) {
        const wPaths = simulate(monthlySavings + extra, savingsStd, prazo);
        whatIfPct = getPct(wPaths, prazo);
        whatIfProb = Math.round(wPaths.filter(p => p[prazo] >= goal).length / N_SIM * 100);
        ttgWhatIf = timeToGoal(wPaths, goal, prazo);
      }

      const reqExtra = requiredFor80(monthlySavings, savingsStd, goal, prazo);

      // Compute median month (from base scenario)
      const counts = new Array(prazo + 1).fill(0);
      ttgBase.forEach(m => { if (m !== null) counts[m]++; });
      let cum = 0, medMonth: number | null = null;
      for (let m = 1; m <= prazo; m++) {
        cum += counts[m];
        if (!medMonth && cum >= N_SIM * 0.5) medMonth = m;
      }

      setRes({ basePct, whatIfPct, ttgBase, ttgWhatIf, baseProb, whatIfProb, reqExtra, medMonth, finalPt: basePct[prazo], simPrazo: prazo, simGoal: goal });
      setAiPhase('idle');
      setAiText('');
    }, 20);

    return () => {
      if (simTimerRef.current) clearTimeout(simTimerRef.current);
    };
  }, [goal, prazo, extra, monthlySavings, savingsStd]);

  // Redraw fan canvas — always use res.simPrazo/simGoal to stay in sync with data
  useEffect(() => {
    if (!res || !fanRef.current) return;
    drawFan(fanRef.current, res.basePct, res.whatIfPct, res.simGoal, res.simPrazo);
  }, [res]);

  // Resize observer (fan chart only — histogram is now React DOM)
  useEffect(() => {
    const el = fanRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      if (res) drawFan(el, res.basePct, res.whatIfPct, res.simGoal, res.simPrazo);
    });
    obs.observe(el.parentElement || el);
    return () => obs.disconnect();
  }, [res]);

  const displayProb = res ? (extra > 0 && res.whatIfProb != null ? res.whatIfProb : res.baseProb) : 0;

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const interpret = useCallback(async () => {
    if (!res) return;
    clearTimer();
    setAiPhase('loading');
    setAiText('');

    try {
      const full = await behavioralService.interpretSimulation({
        meta: goal,
        prazo,
        sobra: monthlySavings,
        desvio: savingsStd,
        prob: res.baseProb,
        mediana: Math.round(res.finalPt.p50),
        p90: Math.round(res.finalPt.p90),
        p10: Math.round(res.finalPt.p10),
        mesMediana: res.medMonth,
        extraNecessario: res.reqExtra,
        extra: extra > 0 ? extra : undefined,
        probExtra: extra > 0 && res.whatIfProb != null ? res.whatIfProb : undefined,
      });

      if (!full) { setAiPhase('done'); setAiText('Sem resposta do modelo.'); return; }

      setAiPhase('typing');
      let i = 0;
      timerRef.current = setInterval(() => {
        i = Math.min(i + 4, full.length);
        setAiText(full.slice(0, i));
        if (i >= full.length) { clearTimer(); setAiPhase('done'); }
      }, 18);
    } catch {
      setAiText('Erro ao interpretar. Verifique se o backend está rodando.');
      setAiPhase('done');
    }
  }, [res, goal, prazo, monthlySavings, savingsStd, extra, clearTimer]);

  // Not enough data
  if (savingsStats.months < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
        <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-700">
          <Target className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Dados insuficientes
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Registre pelo menos 2 meses de transações para simular metas
          </p>
        </div>
      </div>
    );
  }


  return (
    <>
      <style>{`
        @keyframes mcFadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:none } }
        @keyframes mcBlink  { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes mcPulse  { 0%,100%{opacity:.3} 50%{opacity:1} }
      `}</style>

      <div className="flex flex-col h-full gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sobra média: <strong className="text-gray-800 dark:text-gray-200">{fmtBRL(monthlySavings)}/mês</strong>
                {' '}· variância: ±{fmtK(savingsStd)}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {N_SIM} simulações · baseado nos últimos {savingsStats.months} meses
              </p>
            </div>
          </div>
          {res && <ProbGauge prob={displayProb} />}
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-2 gap-x-6">
          <SliderRow label="Meta" value={goal} min={100} max={100000} step={1}
            useNumberInput inputPrefix="R$" onChange={setGoal} />
          <SliderRow label="Prazo" value={prazo} min={3} max={36} step={1}
            useNumberInput inputSuffix="meses" onChange={setPrazo} />
        </div>

        {/* What-if toggle */}
        <div>
          {!showExtra ? (
            <button
              onClick={() => setShowExtra(true)}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400
                         hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
              Simular economia extra
            </button>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Hipótese: economizar extra
                </span>
                <button
                  onClick={() => { setShowExtra(false); setExtra(0); }}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600
                             dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Fechar
                </button>
              </div>
              <SliderRow label="Extra por mês" value={extra} min={0} max={3000} step={50}
                display={extra > 0 ? `+${fmtK(extra)}/mês` : 'Sem extra'} onChange={setExtra} />
              {extra > 0 && res?.whatIfProb != null && (
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  Com +{fmtK(extra)}/mês → <strong>{res.whatIfProb}%</strong> de probabilidade (era {res.baseProb}%)
                </p>
              )}
            </div>
          )}
        </div>

        {/* Fan chart */}
        <div className="relative">
          <canvas
            ref={fanRef}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-lg"
            style={{ height: 210, display: 'block' }}
          />
          <div className="absolute top-2.5 right-3 flex gap-3 text-[10px] text-gray-400 dark:text-gray-500
                          bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded backdrop-blur-sm">
            <span>— mediana</span>
            <span className="text-blue-500">-- meta</span>
            {showExtra && extra > 0 && <span className="text-purple-500">— hipótese</span>}
          </div>
        </div>


        {/* Timing histogram — interactive React component */}
        {res && (() => {
          const isWhatIf = extra > 0 && res.ttgWhatIf != null;
          const activeTtg = isWhatIf ? res.ttgWhatIf! : res.ttgBase;
          return (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                  Em qual mês a meta é atingida — passe o mouse para detalhes
                </p>
                {isWhatIf && (
                  <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400
                                   bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded">
                    cenário hipótese
                  </span>
                )}
              </div>
              <TimingHistogram ttg={activeTtg} prazo={res.simPrazo} />
            </div>
          );
        })()}


        {/* Stats cards */}
        {res && (
          <div
            key={`${goal}-${prazo}-${extra}`}
            className="grid grid-cols-3 gap-2"
            style={{ animation: 'mcFadeIn 0.3s ease both' }}
          >
            <div className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Mediana final</p>
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{fmtK(res.finalPt.p50)}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mb-1">Melhor cenário (P90)</p>
              <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">{fmtK(res.finalPt.p90)}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
              <p className="text-[10px] text-red-700 dark:text-red-400 mb-1">Pior cenário (P10)</p>
              <p className="text-lg font-medium text-red-700 dark:text-red-400">{fmtK(res.finalPt.p10)}</p>
            </div>
          </div>
        )}

        {/* Analytical insight */}
        {res && (
          <div className={`flex items-start gap-2.5 p-3 rounded-xl border ${res.reqExtra === 0
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
            : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
            }`}>
            <TrendingUp className={`w-4 h-4 mt-0.5 flex-shrink-0 ${res.reqExtra === 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
              }`} />
            {res.reqExtra === 0 ? (
              <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">
                Você já tem 80%+ de probabilidade de atingir a meta.
                {res.medMonth && ` A maioria das simulações chega lá no mês ${res.medMonth}.`}
              </p>
            ) : (
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                Para 80% de probabilidade, você precisa de{' '}
                <strong>+{fmtK(res.reqExtra)}/mês</strong> de sobra — reduza{' '}
                <strong>{fmtK(res.reqExtra)}</strong> nos gastos ou aumente a renda.
              </p>
            )}
          </div>
        )}

        {/* AI interpretation */}
        <div>
          {aiPhase === 'idle' && res && (
            <button
              onClick={interpret}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                         bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900
                         hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Interpretar com IA
            </button>
          )}

          {aiPhase === 'loading' && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Analisando cenários...
            </div>
          )}

          {(aiPhase === 'typing' || aiPhase === 'done') && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-1.5 h-1.5 rounded-full ${aiPhase === 'typing' ? 'bg-purple-500 animate-pulse' : 'bg-emerald-500'
                  }`} />
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {aiPhase === 'typing' ? 'Interpretando...' : 'Interpretação concluída'}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700
                              rounded-xl p-3.5 text-sm text-gray-700 dark:text-gray-300
                              leading-relaxed whitespace-pre-wrap">
                {aiText}
                {aiPhase === 'typing' && (
                  <span className="text-purple-500 dark:text-purple-400 ml-0.5"
                    style={{ animation: 'mcBlink 0.8s infinite' }}>▌</span>
                )}
              </div>
              {aiPhase === 'done' && (
                <button
                  onClick={() => { setAiPhase('idle'); setAiText(''); }}
                  className="flex items-center gap-1 mt-2 text-xs text-gray-400 dark:text-gray-500
                             hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Nova interpretação
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
