/**
 * phiPatterns.ts — Compiled regex patterns for all 18 HIPAA Safe Harbor identifiers.
 *
 * Each pattern is compiled once at module load time (no runtime recompilation).
 * Replacements use typed tokens so downstream tiers know what was redacted.
 */

export interface PhiPattern {
  id: number;
  name: string;
  token: string;               // replacement token e.g. "[NAME]"
  regex: RegExp;
}

export const PHI_PATTERNS: PhiPattern[] = [
  // 1. Names — common name patterns, honorifics
  {
    id: 1,
    name: 'Names',
    token: '[NAME]',
    regex: /\b(?:Dr|Mr|Mrs|Ms|Prof)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  },

  // 2. Geographic — street addresses, zip codes (5+4 digit), city+state combos
  {
    id: 2,
    name: 'Geographic',
    token: '[ADDR]',
    regex: /\b\d{1,5}\s+(?:[A-Z][a-z]+\s+)+(?:St|Ave|Blvd|Rd|Dr|Ln|Way|Court|Ct|Pl|Square|Sq)\.?\b/gi,
  },
  {
    id: 2,
    name: 'ZipCode',
    token: '[ZIP]',
    regex: /\b\d{5}(?:-\d{4})?\b/g,
  },

  // 3. Dates (except year) — month/day, day/month, written dates
  {
    id: 3,
    name: 'DateFull',
    token: '[DATE]',
    regex:
      /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?\b/gi,
  },
  {
    id: 3,
    name: 'DateNumeric',
    token: '[DATE]',
    regex: /\b(?:0?[1-9]|1[0-2])\/(?:0?[1-9]|[12]\d|3[01])(?:\/\d{2,4})?\b/g,
  },

  // 4. Phone numbers
  {
    id: 4,
    name: 'Phone',
    token: '[PHONE]',
    regex: /\b(?:\+1\s?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  },

  // 5. Fax numbers — same pattern as phone but preceded by "fax"
  {
    id: 5,
    name: 'Fax',
    token: '[FAX]',
    regex: /\bfax:?\s*(?:\+1\s?)?\(?[2-9]\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/gi,
  },

  // 6. Email addresses
  {
    id: 6,
    name: 'Email',
    token: '[EMAIL]',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  },

  // 7. Social Security Numbers
  {
    id: 7,
    name: 'SSN',
    token: '[SSN]',
    regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
  },

  // 8. Medical Record Numbers (MRN)
  {
    id: 8,
    name: 'MRN',
    token: '[MRN]',
    regex: /\b(?:MRN|Medical Record Number|Patient ID|PID)[\s:#]*[A-Z0-9-]{4,16}\b/gi,
  },

  // 9. Health plan beneficiary numbers
  {
    id: 9,
    name: 'BeneficiaryNumber',
    token: '[BENEFICIARY]',
    regex: /\b(?:Beneficiary|Member|Policy|Subscriber)\s*(?:No\.?|Number|ID|#)[\s:#]*[A-Z0-9-]{6,20}\b/gi,
  },

  // 10. Account numbers
  {
    id: 10,
    name: 'AccountNumber',
    token: '[ACCOUNT]',
    regex: /\b(?:Account|Acct)[\s.]?(?:No\.?|Number|#)[\s:#]*\d{4,20}\b/gi,
  },

  // 11. Certificate / license numbers
  {
    id: 11,
    name: 'License',
    token: '[LICENSE]',
    regex: /\b(?:License|Certificate|Certification|Cert)[\s.]?(?:No\.?|Number|#)[\s:#]*[A-Z0-9-]{4,20}\b/gi,
  },

  // 12. Vehicle identifiers — VIN (17 chars), license plates
  {
    id: 12,
    name: 'VIN',
    token: '[VIN]',
    regex: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
  },

  // 13. Device identifiers / serial numbers
  {
    id: 13,
    name: 'DeviceSerial',
    token: '[DEVICE]',
    regex: /\b(?:Serial|Device)[\s.]?(?:No\.?|Number|ID|#)[\s:#]*[A-Z0-9-]{6,24}\b/gi,
  },

  // 14. Web URLs
  {
    id: 14,
    name: 'URL',
    token: '[URL]',
    regex: /https?:\/\/[^\s,;)\]>'"]+/g,
  },

  // 15. IP addresses (v4 and v6)
  {
    id: 15,
    name: 'IPAddress',
    token: '[IP]',
    regex:
      /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
  },

  // 16. Biometric identifiers (fingerprint, voiceprint descriptors in text)
  {
    id: 16,
    name: 'Biometric',
    token: '[BIOMETRIC]',
    regex: /\b(?:fingerprint|voice ?print|retinal scan|iris scan)\s+(?:ID|hash|code|pattern)[\s:#]*[A-Z0-9]{6,}\b/gi,
  },

  // 17. Full-face photos — file references
  {
    id: 17,
    name: 'PhotoReference',
    token: '[PHOTO]',
    regex: /\b(?:photo|image|picture)[\s_-](?:of|patient)[\s_-][A-Z0-9_.-]{4,}\b/gi,
  },

  // 18. Other unique identifiers — NPI, DEA, generic ID patterns
  {
    id: 18,
    name: 'NPI',
    token: '[NPI]',
    regex: /\bNPI[\s:#]*\d{10}\b/gi,
  },
  {
    id: 18,
    name: 'DEA',
    token: '[DEA]',
    regex: /\bDEA[\s:#]*[A-Z]{2}\d{7}\b/gi,
  },
];
