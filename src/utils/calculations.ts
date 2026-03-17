import type { PensionEntry, PensionDeductions, TaxBreakdown, TaxSettings } from '../types';

// ─── German Tax Constants (2024) ──────────────────────────────────────────────

const WERBUNGSKOSTENPAUSCHALE = 102; // Flat deduction for pensioners
const SONDERAUSGABEN_PAUSCHBETRAG = 36; // Flat special expenses deduction
const KV_BASISBEITRAGSSATZ = 14.6; // Base health insurance rate %
const PV_BEITRAGSSATZ_MIT_KINDER = 3.05; // PV rate with children %
const PV_BEITRAGSSATZ_OHNE_KINDER = 3.4; // PV rate without children %

// ─── Besteuerungsanteil gesetzliche Rente ─────────────────────────────────────

/**
 * Returns the taxable fraction (0–1) for a gesetzliche Rente
 * based on the year the pension started.
 * § 22 Nr. 1 Satz 3 Buchst. a EStG
 */
export function getBesteuerungsanteil(startYear: number): number {
  if (startYear <= 2005) return 0.50;
  if (startYear >= 2040) return 1.00;
  if (startYear <= 2020) return 0.50 + (startYear - 2005) * 0.02;
  // 2021–2039: +1% per year starting from 80% in 2020
  return 0.80 + (startYear - 2020) * 0.01;
}

// ─── Social Contribution Calculation ─────────────────────────────────────────

/**
 * Calculates KV and PV deductions for a single pension entry.
 * Only applies to statutorily-insured pensioners.
 */
export function calcPensionDeductions(
  entry: PensionEntry,
  taxSettings: TaxSettings,
): PensionDeductions {
  if (!taxSettings.statutorilyInsured) {
    return {
      kvMonthly: 0,
      pvMonthly: 0,
      taxableAnnual: calcTaxableAmount(entry),
    };
  }

  const pvRate =
    taxSettings.hasChildren
      ? PV_BEITRAGSSATZ_MIT_KINDER
      : PV_BEITRAGSSATZ_OHNE_KINDER;

  let kvMonthly = 0;
  let pvMonthly = 0;

  switch (entry.type) {
    case 'gesetzlich': {
      // DRV pays half of KV base rate; pensioner pays own half + half Zusatzbeitrag
      const halfZusatz = taxSettings.kvZusatzbeitrag / 2;
      const kvRate = KV_BASISBEITRAGSSATZ / 2 + halfZusatz;
      kvMonthly = (entry.monthlyGross * kvRate) / 100;
      // DRV does NOT subsidise PV; pensioner pays full PV rate
      pvMonthly = (entry.monthlyGross * pvRate) / 100;
      break;
    }
    case 'betrieblich': {
      // Pensioner pays full KV + PV rate (no employer subsidy in retirement)
      const kvRate = KV_BASISBEITRAGSSATZ + taxSettings.kvZusatzbeitrag;
      kvMonthly = (entry.monthlyGross * kvRate) / 100;
      pvMonthly = (entry.monthlyGross * pvRate) / 100;
      break;
    }
    case 'ruerup':
    case 'riester':
    case 'privat':
    default:
      // Private/subsidised pensions are generally KV-frei for GKV members
      kvMonthly = 0;
      pvMonthly = 0;
      break;
  }

  return {
    kvMonthly,
    pvMonthly,
    taxableAnnual: calcTaxableAmount(entry),
  };
}

/**
 * Returns the taxable annual amount for a pension entry
 * (before personal allowances such as Grundfreibetrag).
 */
function calcTaxableAmount(entry: PensionEntry): number {
  const annualGross = entry.monthlyGross * 12;

  switch (entry.type) {
    case 'gesetzlich': {
      const anteil = getBesteuerungsanteil(entry.startYear);
      return annualGross * anteil;
    }
    case 'ruerup':
    case 'betrieblich':
    case 'riester':
      // These pensions are taxed in full (Vollbesteuerung / nachgelagerte Besteuerung)
      return annualGross;
    case 'privat':
      // Simplified: use Ertragsanteil approximation (here: 18% for age 65)
      return annualGross * 0.18;
    default:
      return annualGross;
  }
}

// ─── German Income Tax (Grundtarif 2024) ─────────────────────────────────────

/**
 * Calculates German income tax (ESt) using the Grundtarif 2024.
 * @param zvE  zu versteuerndes Einkommen (taxable income) in €
 * @returns    annual income tax in €
 */
export function calcEinkommensteuer(zvE: number): number {
  if (zvE <= 0) return 0;

  // 2024 tax zones (§ 32a EStG)
  const ZONE1_START = 11_604;
  const ZONE1_END = 17_005;
  const ZONE2_END = 66_760;
  const ZONE3_END = 277_825;

  if (zvE <= ZONE1_START) return 0;

  if (zvE <= ZONE1_END) {
    const y = (zvE - ZONE1_START) / 10_000;
    return Math.floor((922.98 * y + 1_400) * y);
  }

  if (zvE <= ZONE2_END) {
    const z = (zvE - ZONE1_END) / 10_000;
    return Math.floor((181.19 * z + 2_397) * z + 938.24);
  }

  if (zvE <= ZONE3_END) {
    return Math.floor(0.42 * zvE - 9_972.98);
  }

  return Math.floor(0.45 * zvE - 18_307.73);
}

// ─── Full Tax Breakdown ───────────────────────────────────────────────────────

/**
 * Calculates the complete tax and deduction breakdown for all pensions.
 */
export function calcTaxBreakdown(
  pensions: PensionEntry[],
  taxSettings: TaxSettings,
): TaxBreakdown {
  if (pensions.length === 0) {
    return {
      totalGrossMonthly: 0,
      totalGrossAnnual: 0,
      totalKvMonthly: 0,
      totalPvMonthly: 0,
      totalSocialMonthly: 0,
      taxableAnnual: 0,
      incomeTaxAnnual: 0,
      incomeTaxMonthly: 0,
      kirchensteuerAnnual: 0,
      kirchensteuerMonthly: 0,
      totalDeductionsMonthly: 0,
      netMonthly: 0,
      netAnnual: 0,
      effectiveTaxRate: 0,
    };
  }

  const deductions = pensions.map((p) => calcPensionDeductions(p, taxSettings));

  const totalGrossMonthly = pensions.reduce((s, p) => s + p.monthlyGross, 0);
  const totalGrossAnnual = totalGrossMonthly * 12;
  const totalKvMonthly = deductions.reduce((s, d) => s + d.kvMonthly, 0);
  const totalPvMonthly = deductions.reduce((s, d) => s + d.pvMonthly, 0);
  const totalSocialMonthly = totalKvMonthly + totalPvMonthly;

  // Sum of taxable amounts from all pensions
  const rawTaxableAnnual = deductions.reduce((s, d) => s + d.taxableAnnual, 0);

  // Subtract Werbungskosten-Pauschbetrag and Sonderausgaben-Pauschbetrag
  const zvE = Math.max(
    0,
    rawTaxableAnnual - WERBUNGSKOSTENPAUSCHALE - SONDERAUSGABEN_PAUSCHBETRAG,
  );

  const incomeTaxAnnual = calcEinkommensteuer(zvE);
  const incomeTaxMonthly = incomeTaxAnnual / 12;

  const kirchensteuerAnnual = taxSettings.kirchensteuer
    ? Math.floor(incomeTaxAnnual * (taxSettings.kirchensteuerRate / 100) * 100) / 100
    : 0;
  const kirchensteuerMonthly = kirchensteuerAnnual / 12;

  const totalDeductionsMonthly =
    totalSocialMonthly + incomeTaxMonthly + kirchensteuerMonthly;

  const netMonthly = totalGrossMonthly - totalDeductionsMonthly;
  const netAnnual = netMonthly * 12;

  const effectiveTaxRate =
    totalGrossAnnual > 0
      ? ((totalDeductionsMonthly * 12) / totalGrossAnnual) * 100
      : 0;

  return {
    totalGrossMonthly,
    totalGrossAnnual,
    totalKvMonthly,
    totalPvMonthly,
    totalSocialMonthly,
    taxableAnnual: zvE,
    incomeTaxAnnual,
    incomeTaxMonthly,
    kirchensteuerAnnual,
    kirchensteuerMonthly,
    totalDeductionsMonthly,
    netMonthly,
    netAnnual,
    effectiveTaxRate,
  };
}
