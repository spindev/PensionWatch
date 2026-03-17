import type { PensionEntry } from '../types';

/** Realistic German demo pension data for 2028 retiree */
export const DEMO_PENSIONS: PensionEntry[] = [
  {
    id: 'demo-1',
    name: 'Deutsche Rentenversicherung',
    type: 'gesetzlich',
    monthlyGross: 1450,
    startYear: 2028,
    notes: 'Gesetzliche Altersrente ab 67',
  },
  {
    id: 'demo-2',
    name: 'Rürup-Rente (Allianz)',
    type: 'ruerup',
    monthlyGross: 320,
    startYear: 2028,
    notes: 'Fondsgebundene Rürup-Rente',
  },
  {
    id: 'demo-3',
    name: 'Betriebsrente (bAV)',
    type: 'betrieblich',
    monthlyGross: 280,
    startYear: 2028,
    notes: 'Direktversicherung über Arbeitgeber',
  },
  {
    id: 'demo-4',
    name: 'Riester-Rente (DWS)',
    type: 'riester',
    monthlyGross: 180,
    startYear: 2028,
    notes: 'Geförderte Riester-Rente',
  },
];
