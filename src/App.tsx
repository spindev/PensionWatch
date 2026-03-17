import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { OverviewChart } from './components/OverviewChart';
import { PensionTable } from './components/PensionTable';
import { PensionModal } from './components/PensionModal';
import { SettingsPage } from './components/SettingsPage';
import { EmptyState } from './components/EmptyState';
import { loadSettings, saveSettings } from './services/settingsService';
import { loadPensions, savePensions } from './services/pensionsService';
import { calcTaxBreakdown } from './utils/calculations';
import type { PensionEntry, Settings } from './types';

type Page = 'dashboard' | 'settings';

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [pensions, setPensions] = useState<PensionEntry[]>(loadPensions);
  const [page, setPage] = useState<Page>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editPension, setEditPension] = useState<PensionEntry | null>(null);
  const [retirementMode, setRetirementMode] = useState<'planned' | 'current'>('planned');

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

  const currentYear = new Date().getFullYear();

  const breakdown = calcTaxBreakdown(
    retirementMode === 'current'
      ? pensions.map((p) =>
          p.type === 'gesetzlich' ? { ...p, startYear: currentYear } : p,
        )
      : pensions,
    settings.tax,
  );

  const retirementYear = (() => {
    if (!settings.retirementDate) return currentYear;
    const d = new Date(settings.retirementDate);
    const y = d.getFullYear();
    return isNaN(y) ? currentYear : y;
  })();

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
          />
        ) : (
          <>
            {/* ─── Retirement Mode Toggle ─────────────────────────────── */}
            <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 self-start">
              <button
                onClick={() => setRetirementMode('planned')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  retirementMode === 'planned'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                Geplanter Renteneintritt
              </button>
              <button
                onClick={() => setRetirementMode('current')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  retirementMode === 'current'
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                Dieses Jahr
              </button>
            </div>

            {/* ─── Monthly Overview ───────────────────────────────── */}
            <OverviewChart
              breakdown={breakdown}
              taxSettings={settings.tax}
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
          retirementYear={retirementYear}
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
