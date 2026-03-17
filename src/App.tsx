import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StatCard } from './components/StatCard';
import { OverviewChart } from './components/OverviewChart';
import { PensionTable } from './components/PensionTable';
import { PensionModal } from './components/PensionModal';
import { SettingsPage } from './components/SettingsPage';
import { EmptyState } from './components/EmptyState';
import { loadSettings, saveSettings } from './services/settingsService';
import { loadPensions, savePensions } from './services/pensionsService';
import { calcTaxBreakdown } from './utils/calculations';
import { DEMO_PENSIONS } from './data/demoData';
import type { PensionEntry, Settings } from './types';

type Page = 'dashboard' | 'settings';

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [pensions, setPensions] = useState<PensionEntry[]>(loadPensions);
  const [page, setPage] = useState<Page>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPension, setEditPension] = useState<PensionEntry | null>(null);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleSaveSettings = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const handleAddPension = useCallback((pension: PensionEntry) => {
    setPensions((prev) => {
      const updated = [...prev, pension];
      savePensions(updated);
      return updated;
    });
    setShowAddModal(false);
  }, []);

  const handleEditPension = useCallback((pension: PensionEntry) => {
    setPensions((prev) => {
      const updated = prev.map((p) => (p.id === pension.id ? pension : p));
      savePensions(updated);
      return updated;
    });
    setEditPension(null);
  }, []);

  const handleDeletePension = useCallback((id: string) => {
    setPensions((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      savePensions(updated);
      return updated;
    });
  }, []);

  const handleClearData = useCallback(() => {
    setPensions([]);
    savePensions([]);
    setPage('dashboard');
  }, []);

  const handleLoadDemo = useCallback(() => {
    setPensions(DEMO_PENSIONS);
    savePensions(DEMO_PENSIONS);
  }, []);

  const breakdown = calcTaxBreakdown(pensions, settings.tax);
  const isDark = settings.theme === 'dark';

  const fmt = (v: number) =>
    v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      <Header
        page={page}
        onNavigate={setPage}
        onAddPension={() => {
          setEditPension(null);
          setShowAddModal(true);
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {pensions.length === 0 ? (
          /* ─── Empty / Welcome State ──────────────────────────────── */
          <EmptyState
            onAddPension={() => {
              setEditPension(null);
              setShowAddModal(true);
            }}
            onLoadDemo={handleLoadDemo}
          />
        ) : (
          <>
            {/* ─── Summary Stats ──────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                title="Gesamtrente Brutto / Monat"
                value={fmt(breakdown.totalGrossMonthly)}
                accent
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                title="KV + PV Abzüge / Monat"
                value={fmt(breakdown.totalSocialMonthly)}
                positive={breakdown.totalSocialMonthly > 0 ? false : null}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                }
                subtitle={
                  settings.tax.statutorilyInsured
                    ? `KV ${fmt(breakdown.totalKvMonthly)} · PV ${fmt(breakdown.totalPvMonthly)}`
                    : 'Privat versichert'
                }
              />
              <StatCard
                title="Einkommensteuer / Monat"
                value={fmt(breakdown.incomeTaxMonthly)}
                positive={breakdown.incomeTaxMonthly > 0 ? false : null}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                }
                subtitle={`Effektivbelastung: ${breakdown.effectiveTaxRate.toFixed(1)} %`}
              />
              <StatCard
                title="Netto-Rente / Monat"
                value={fmt(breakdown.netMonthly)}
                positive={breakdown.netMonthly > 0 || null}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                subtitle={`${fmt(breakdown.netAnnual)} / Jahr`}
              />
            </div>

            {/* ─── Charts ─────────────────────────────────────────── */}
            <OverviewChart
              pensions={pensions}
              breakdown={breakdown}
              taxSettings={settings.tax}
              isDark={isDark}
            />

            {/* ─── Pension Table ───────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-900 dark:text-white font-semibold">
                  Rentenquellen ({pensions.length})
                </h2>
                <button
                  onClick={() => {
                    setEditPension(null);
                    setShowAddModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Rente hinzufügen
                </button>
              </div>
              <PensionTable
                pensions={pensions}
                onEdit={(p) => {
                  setEditPension(p);
                  setShowAddModal(false);
                }}
                onDelete={handleDeletePension}
              />
            </div>

            {/* ─── Annual Summary ──────────────────────────────────── */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-gray-200 dark:border-slate-700">
              <h2 className="text-gray-900 dark:text-white font-semibold mb-4">
                Jährliche Zusammenfassung
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-slate-400 text-xs">Brutto / Jahr</p>
                  <p className="text-gray-900 dark:text-white font-bold tabular-nums mt-0.5">
                    {fmt(breakdown.totalGrossAnnual)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-slate-400 text-xs">Sozialabgaben / Jahr</p>
                  <p className="text-red-600 dark:text-red-400 font-bold tabular-nums mt-0.5">
                    − {fmt(breakdown.totalSocialMonthly * 12)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-slate-400 text-xs">
                    Einkommensteuer{breakdown.kirchensteuerAnnual > 0 ? ' + KiSt' : ''} / Jahr
                  </p>
                  <p className="text-red-600 dark:text-red-400 font-bold tabular-nums mt-0.5">
                    − {fmt(breakdown.incomeTaxAnnual + breakdown.kirchensteuerAnnual)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-slate-400 text-xs">Netto / Jahr</p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-bold tabular-nums mt-0.5">
                    {fmt(breakdown.netAnnual)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <p className="text-gray-400 dark:text-slate-500 text-xs">
                  * Schätzung auf Basis der angegebenen Rentenbeträge und Steuereinstellungen (Stand 2024).
                  Individuelle Freibeträge, Werbungskosten und weitere Abzüge können das Ergebnis
                  verändern.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      {/* ─── Modals / Overlays ────────────────────────────────────────────── */}
      {page === 'settings' && (
        <SettingsPage
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setPage('dashboard')}
          onClearData={handleClearData}
        />
      )}

      {(showAddModal || editPension != null) && (
        <PensionModal
          pension={editPension}
          onSave={editPension != null ? handleEditPension : handleAddPension}
          onClose={() => {
            setShowAddModal(false);
            setEditPension(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
