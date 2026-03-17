import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { PensionEntry, TaxBreakdown } from '../types';
import { PENSION_TYPE_COLORS, PENSION_TYPE_LABELS } from '../types';
import { calcPensionDeductions } from '../utils/calculations';
import type { TaxSettings } from '../types';

interface OverviewChartProps {
  pensions: PensionEntry[];
  breakdown: TaxBreakdown;
  taxSettings: TaxSettings;
  isDark: boolean;
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; name: string; fill?: string }[];
  label?: string;
}

const fmt = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-gray-600 dark:text-slate-300">
          {p.name}: <span className="font-medium">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const CustomPieTooltip: React.FC<{ active?: boolean; payload?: TooltipPayload[] }> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-900 dark:text-white">{item.name}</p>
      <p className="text-gray-600 dark:text-slate-300">{fmt(item.value)} / Monat</p>
    </div>
  );
};

export const OverviewChart: React.FC<OverviewChartProps> = ({
  pensions,
  breakdown,
  taxSettings,
  isDark,
}) => {
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  // Bar chart: brutto vs. netto per pension
  const barData = pensions.map((p) => {
    const deductions = calcPensionDeductions(p, taxSettings);
    const socialMonthly = deductions.kvMonthly + deductions.pvMonthly;
    return {
      name: p.name.length > 14 ? p.name.slice(0, 12) + '…' : p.name,
      Brutto: p.monthlyGross,
      'KV/PV': Math.round(socialMonthly * 100) / 100,
    };
  });

  // Pie chart: share of gross per pension type (aggregated)
  const typeMap = new Map<string, number>();
  for (const p of pensions) {
    const label = PENSION_TYPE_LABELS[p.type];
    typeMap.set(label, (typeMap.get(label) ?? 0) + p.monthlyGross);
  }
  const pieData = Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));

  // Get color for pie segment by label
  const labelToColor: Record<string, string> = {};
  for (const [type, label] of Object.entries(PENSION_TYPE_LABELS)) {
    labelToColor[label] = PENSION_TYPE_COLORS[type as keyof typeof PENSION_TYPE_COLORS];
  }

  if (pensions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-gray-200 dark:border-slate-700 flex items-center justify-center min-h-[220px]">
        <p className="text-gray-400 dark:text-slate-500 text-sm">
          Noch keine Renten eingetragen.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Bar chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="text-gray-700 dark:text-slate-300 text-sm font-medium mb-4">
          Brutto-Rente &amp; KV/PV-Abzüge (€/Monat)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} />
            <YAxis
              tick={{ fill: tickColor, fontSize: 11 }}
              tickFormatter={(v: number) => v.toLocaleString('de-DE') + ' €'}
              width={72}
            />
            <Tooltip content={<CustomBarTooltip />} />
            <Bar dataKey="Brutto" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="KV/PV" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="text-gray-700 dark:text-slate-300 text-sm font-medium mb-4">
          Verteilung nach Rentenart (Brutto)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={labelToColor[entry.name] ?? '#94a3b8'}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomPieTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-gray-600 dark:text-slate-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Summary bar: gross → deductions → net */}
      <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
        <h3 className="text-gray-700 dark:text-slate-300 text-sm font-medium mb-3">
          Monatliche Übersicht
        </h3>
        <div className="space-y-2">
          <SummaryRow
            label="Brutto gesamt"
            value={breakdown.totalGrossMonthly}
            color="bg-blue-500"
            max={breakdown.totalGrossMonthly}
          />
          <SummaryRow
            label={`KV-Abzüge${taxSettings.statutorilyInsured ? '' : ' (privat versichert – keine)'}`}
            value={breakdown.totalKvMonthly}
            color="bg-orange-400"
            max={breakdown.totalGrossMonthly}
          />
          <SummaryRow
            label="PV-Abzüge"
            value={breakdown.totalPvMonthly}
            color="bg-yellow-400"
            max={breakdown.totalGrossMonthly}
          />
          <SummaryRow
            label="Einkommensteuer"
            value={breakdown.incomeTaxMonthly}
            color="bg-red-500"
            max={breakdown.totalGrossMonthly}
          />
          {breakdown.kirchensteuerMonthly > 0 && (
            <SummaryRow
              label="Kirchensteuer"
              value={breakdown.kirchensteuerMonthly}
              color="bg-red-300"
              max={breakdown.totalGrossMonthly}
            />
          )}
          <div className="border-t border-gray-200 dark:border-slate-700 pt-2">
            <SummaryRow
              label="Netto (geschätzt)"
              value={breakdown.netMonthly}
              color="bg-emerald-500"
              max={breakdown.totalGrossMonthly}
              highlight
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SummaryRowProps {
  label: string;
  value: number;
  color: string;
  max: number;
  highlight?: boolean;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, color, max, highlight }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-44 flex-shrink-0 ${highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
        {label}
      </span>
      <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs w-24 text-right flex-shrink-0 tabular-nums ${highlight ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-slate-300'}`}>
        {value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
      </span>
    </div>
  );
};
