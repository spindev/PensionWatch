import React, { useState, useRef, useEffect } from 'react';
import type { TaxBreakdown, TaxSettings } from '../types';

interface OverviewChartProps {
  breakdown: TaxBreakdown;
  taxSettings: TaxSettings;
}

const fmt = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const fmtPct = (v: number) =>
  v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' %';

export const OverviewChart: React.FC<OverviewChartProps> = ({
  breakdown,
  taxSettings,
}) => {
  const [showKvDetails, setShowKvDetails] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showKvDetails) return;
    const handleClick = (e: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        setShowKvDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showKvDetails]);

  if (breakdown.totalGrossMonthly === 0) return null;

  const pvRate = taxSettings.hasChildren ? 3.05 : 3.4;

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
          label="Einkommensteuer"
          value={breakdown.incomeTaxMonthly}
          color="bg-red-500"
          max={breakdown.totalGrossMonthly}
        />
        <SummaryRow
          label="Sozialabgaben"
          value={breakdown.totalSocialMonthly}
          color="bg-orange-400"
          max={breakdown.totalGrossMonthly}
          infoButton={
            <div className="relative" ref={detailsRef}>
              <button
                onClick={() => setShowKvDetails((v) => !v)}
                className="ml-1 w-4 h-4 rounded-full bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-500 transition-colors flex items-center justify-center flex-shrink-0 text-[10px] font-bold leading-none"
                aria-label="Details zu Sozialabgaben"
              >
                ?
              </button>
              {showKvDetails && (
                <div className="absolute left-0 top-6 z-50 w-64 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl shadow-xl p-3 space-y-2 text-xs">
                  <p className="font-semibold text-gray-800 dark:text-white">Details Sozialabgaben</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Krankenversicherung (KV)</span>
                      <span className="font-medium text-gray-800 dark:text-white tabular-nums">{fmt(breakdown.totalKvMonthly)}</span>
                    </div>
                    <div className="flex justify-between pl-3 text-gray-400 dark:text-slate-500">
                      <span>Basisbeitrag (½)</span>
                      <span>{fmtPct(7.3)}</span>
                    </div>
                    <div className="flex justify-between pl-3 text-gray-400 dark:text-slate-500">
                      <span>Zusatzbeitrag (½)</span>
                      <span>{fmtPct(taxSettings.kvZusatzbeitrag / 2)}</span>
                    </div>
                    <div className="border-t border-gray-100 dark:border-slate-600 pt-1.5 flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Pflegeversicherung (PV)</span>
                      <span className="font-medium text-gray-800 dark:text-white tabular-nums">{fmt(breakdown.totalPvMonthly)}</span>
                    </div>
                    <div className="flex justify-between pl-3 text-gray-400 dark:text-slate-500">
                      <span>{taxSettings.hasChildren ? 'mit Kindern' : 'ohne Kinder'}</span>
                      <span>{fmtPct(pvRate)}</span>
                    </div>
                    <div className="border-t border-gray-100 dark:border-slate-600 pt-1.5 flex justify-between font-semibold text-gray-800 dark:text-white">
                      <span>Gesamt</span>
                      <span className="tabular-nums">{fmt(breakdown.totalSocialMonthly)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          }
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
  infoButton?: React.ReactNode;
}

const SummaryRow: React.FC<SummaryRowProps> = ({ label, value, color, max, highlight, infoButton }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-48 flex-shrink-0 flex items-center ${highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 dark:text-slate-400'}`}>
        {label}
        {infoButton}
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
