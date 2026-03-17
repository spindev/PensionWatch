import React from 'react';
import type { TaxBreakdown } from '../types';
import type { TaxSettings } from '../types';

interface OverviewChartProps {
  breakdown: TaxBreakdown;
  taxSettings: TaxSettings;
}

const fmt = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

export const OverviewChart: React.FC<OverviewChartProps> = ({
  breakdown,
  taxSettings,
}) => {
  if (breakdown.totalGrossMonthly === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
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
          label={`KV + PV${taxSettings.statutorilyInsured ? ` (${fmt(breakdown.totalKvMonthly)} + ${fmt(breakdown.totalPvMonthly)})` : ' (privat versichert)'}`}
          value={breakdown.totalSocialMonthly}
          color="bg-orange-400"
          max={breakdown.totalGrossMonthly}
        />
        <SummaryRow
          label="Einkommensteuer"
          value={breakdown.incomeTaxMonthly}
          color="bg-red-500"
          max={breakdown.totalGrossMonthly}
        />
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
      <span className={`text-xs w-48 flex-shrink-0 ${highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
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
