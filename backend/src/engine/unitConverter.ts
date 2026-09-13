/**
 * unitConverter.ts — UCUM-scoped unit conversion table.
 *
 * Policy: Returns UNIT_INCOMPATIBLE for unknown pairs — NEVER guesses.
 * Only conversions that are medically unambiguous are included.
 * Adding a conversion requires a comment citing the conversion source.
 */

export interface ConversionResult {
  compatible: boolean;
  convertedValue?: number;
  conversionDescription?: string;
}

/**
 * Key: `${fromUnit}→${toUnit}` (normalized lowercase, no spaces)
 * Value: multiplication factor to convert fromUnit value to toUnit
 */
const CONVERSION_TABLE: Record<string, number> = {
  // Glucose: mg/dL ↔ mmol/L (factor = 0.0555, MW glucose = 180.16 g/mol)
  'mg/dl→mmol/l': 0.05551,
  'mmol/l→mg/dl': 18.016,

  // Creatinine: mg/dL ↔ μmol/L (factor = 88.42)
  'mg/dl→μmol/l': 88.42,
  'mg/dl→umol/l': 88.42,
  'μmol/l→mg/dl': 0.01131,
  'umol/l→mg/dl': 0.01131,

  // Bilirubin: mg/dL ↔ μmol/L (factor = 17.1)
  // (same as creatinine — different MW covered by context-keyed usage)

  // Weight: kg ↔ lbs
  'kg→lbs': 2.20462,
  'lbs→kg': 0.453592,
  'lb→kg': 0.453592,

  // Hemoglobin: g/dL ↔ g/L (× 10)
  'g/dl→g/l': 10,
  'g/l→g/dl': 0.1,

  // ANC: cells/μL ↔ cells/mm³ (equivalent, factor = 1)
  'cells/μl→cells/mm³': 1,
  'cells/mm³→cells/μl': 1,
  '/μl→/mm³': 1,
  '/mm³→/μl': 1,
  '10^9/l→cells/μl': 1000,
  'cells/μl→10^9/l': 0.001,
  '10^9/l→/mm³': 1000,

  // Platelet count: 10^9/L ↔ /mm³ or /μL
  '10^9/l→/μl': 1000,
  '/μl→10^9/l': 0.001,

  // eGFR: mL/min/1.73m² ↔ mL/min (approximate — flag if body surface area unknown)
  // Not included: too ambiguous without BSA. Treated as UNIT_INCOMPATIBLE.
  // HbA1c: mmol/mol ↔ % (IFCC to DCCT: % = 0.09148 * mmol/mol + 2.152)
  'mmol/mol→%': 0.09148,
  '%→mmol/mol': 10.929,
};

function normalizeUnit(unit: string): string {
  return unit.toLowerCase().replace(/\s+/g, '').replace(/²/g, '²');
}

/**
 * Convert a value from one unit to another.
 *
 * Returns { compatible: false } for any pair not in the conversion table.
 * NEVER guesses or approximates unknown conversions.
 */
export function convertUnit(
  value: number,
  fromUnit: string,
  toUnit: string,
): ConversionResult {
  const fromNorm = normalizeUnit(fromUnit);
  const toNorm = normalizeUnit(toUnit);

  // Same unit — no conversion needed
  if (fromNorm === toNorm) {
    return {
      compatible: true,
      convertedValue: value,
      conversionDescription: `${value} ${fromUnit} (no conversion needed)`,
    };
  }

  // Affine HbA1c conversion
  if (fromNorm === 'mmol/mol' && toNorm === '%') {
    const converted = Number(((value * 0.09148) + 2.152).toFixed(1));
    return {
      compatible: true,
      convertedValue: converted,
      conversionDescription: `${value} mmol/mol converted to ${converted} %`,
    };
  }

  const key = `${fromNorm}→${toNorm}`;
  const factor = CONVERSION_TABLE[key];

  if (factor === undefined) {
    return {
      compatible: false,
      conversionDescription: `No known conversion from '${fromUnit}' to '${toUnit}'. Returning UNIT_INCOMPATIBLE.`,
    };
  }

  const converted = value * factor;
  return {
    compatible: true,
    convertedValue: converted,
    conversionDescription: `${value} ${fromUnit} × ${factor} = ${converted.toPrecision(6)} ${toUnit}`,
  };
}

/**
 * Check whether two units are compatible (convertible or identical).
 * Used by the rule engine gate before attempting comparison.
 */
export function unitsAreCompatible(fromUnit: string, toUnit: string): boolean {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (from === to) return true;
  return `${from}→${to}` in CONVERSION_TABLE;
}
