import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind CSS class names with clsx conflict resolution */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats a full ISO timestamp into a readable clinical date-time string */
export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
}

/** Truncates a hex hash or UUID for compact display */
export function truncateHash(hash: string | undefined | null, leadingChars = 6, trailingChars = 6): string {
  if (!hash) return '';
  if (hash.length <= leadingChars + trailingChars) return hash;
  return `${hash.slice(0, leadingChars)}...${hash.slice(-trailingChars)}`;
}

/** Returns status color classes based on verdict / gate result for Light Clinical Theme */
export function getVerdictBadgeClass(verdict: string | undefined): { bg: string; text: string; border: string; label: string } {
  switch (verdict) {
    case 'ELIGIBLE':
    case 'PASSED':
      return {
        bg: 'bg-emerald-50 font-bold',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        label: 'ELIGIBLE',
      };
    case 'INELIGIBLE':
    case 'BLOCKED':
      return {
        bg: 'bg-rose-50 font-bold',
        text: 'text-rose-700',
        border: 'border-rose-200',
        label: 'INELIGIBLE',
      };
    case 'REQUIRES_HUMAN_REVIEW':
    case 'REQUIRES_REVIEW':
      return {
        bg: 'bg-amber-50 font-bold',
        text: 'text-amber-700',
        border: 'border-amber-200',
        label: 'REQUIRES HUMAN REVIEW',
      };
    default:
      return {
        bg: 'bg-slate-100 font-bold',
        text: 'text-slate-700',
        border: 'border-slate-200',
        label: verdict || 'UNKNOWN',
      };
  }
}
